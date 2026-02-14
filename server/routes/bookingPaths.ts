import { Request, Response, Router } from 'express';
import { parseBookingDates } from '../utils/dateUtils';
import { storage } from '../storage';
import { insertBookingSchema } from '@shared/schema';
import { teamSchedulingService } from '../utils/teamSchedulingService';
import { getUniqueUserPath, getUniqueTeamPath, getUniqueOrganizationPath, parseBookingPath } from '../utils/pathUtils';
import { sendSlackNotification } from '../utils/slackNotificationService';
import { createGoogleMeetLink } from '../utils/googleMeetService';

/**
 * This module handles all the new booking link path formats
 * - User paths: /{userPath}/booking/{slug}
 * - Team paths: /team/{teamSlug}/booking/{slug}
 * - Organization paths: /org/{orgSlug}/booking/{slug}
 */

const router = Router();

/**
 * Get booking link details - supports all path formats
 */
router.get('/:path(*)/booking/:slug', async (req, res) => {
  try {
    const fullPath = req.params.path;
    const slug = req.params.slug;
    
    console.log(`[BOOKING_PATH] Processing booking link request for path: ${fullPath}, slug: ${slug}`);
    
    // Parse the path to determine type (user, team, org)
    const parsedPath = parseBookingPath(`${fullPath}/booking/${slug}`);
    
    if (parsedPath.type === 'unknown' || !parsedPath.slug) {
      console.log(`[BOOKING_PATH] Invalid path format: ${fullPath}`);
      return res.status(404).json({ message: 'Invalid booking link path' });
    }
    
    console.log(`[BOOKING_PATH] Path type: ${parsedPath.type}, identifier: ${parsedPath.identifier}, slug: ${parsedPath.slug}`);
    
    // Find the booking link
    const bookingLink = await storage.getBookingLinkBySlug(parsedPath.slug);
    
    if (!bookingLink) {
      console.log(`[BOOKING_PATH] Booking link with slug ${parsedPath.slug} not found`);
      return res.status(404).json({ message: 'Booking link not found' });
    }
    
    // Handle different path types
    let expectedPath = '';
    let owner = null;
    let team = null;
    let organization = null;
    
    if (parsedPath.type === 'user') {
      // User path type - get the owner and verify path
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        console.log(`[BOOKING_PATH] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Generate expected user path
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      if (parsedPath.identifier !== userPath) {
        console.log(`[BOOKING_PATH] User path mismatch: Expected ${userPath}, got ${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
    } 
    else if (parsedPath.type === 'team') {
      // Team path type - check if it's a team booking
      if (!bookingLink.isTeamBooking || !bookingLink.teamId) {
        console.log(`[BOOKING_PATH] Booking link ${parsedPath.slug} is not a team booking`);
        
        // Find the owner and redirect to user path
        owner = await storage.getUser(bookingLink.userId);
        
        if (!owner) {
          console.log(`[BOOKING_PATH] Owner with ID ${bookingLink.userId} not found`);
          return res.status(404).json({ message: 'Booking link owner not found' });
        }
        
        const userPath = await getUniqueUserPath(owner);
        expectedPath = `${userPath}/booking/${parsedPath.slug}`;
        
        console.log(`[BOOKING_PATH] Redirecting team path to user path: ${expectedPath}`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
      
      // Get the team
      team = await storage.getTeam(bookingLink.teamId);
      
      if (!team) {
        console.log(`[BOOKING_PATH] Team with ID ${bookingLink.teamId} not found`);
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Verify path
      const teamPath = await getUniqueTeamPath(team);
      expectedPath = `${teamPath}/booking/${parsedPath.slug}`;
      const expectedIdentifier = teamPath.replace('/booking', '');
      
      if (`team/${parsedPath.identifier}` !== expectedIdentifier) {
        console.log(`[BOOKING_PATH] Team path mismatch: Expected ${expectedIdentifier}, got team/${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
      
      // Get the owner for display
      owner = await storage.getUser(bookingLink.userId);
    }
    else if (parsedPath.type === 'org') {
      // Organization path type
      // This is for future implementation - currently redirect to user path
      console.log(`[BOOKING_PATH] Organization path type is not fully implemented yet`);
      
      // Find the owner and redirect to user path
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        console.log(`[BOOKING_PATH] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      console.log(`[BOOKING_PATH] Redirecting org path to user path: ${expectedPath}`);
      return res.status(307).json({
        message: 'Redirecting to correct booking link path',
        redirectUrl: `/${expectedPath}`
      });
    }
    
    // At this point, we have validated the path and have the booking link info
    // Check if booking link is active
    const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
    
    if (!isActive) {
      return res.status(404).json({ message: 'Booking link is inactive' });
    }
    
    // Additional info for team bookings
    let teamName = null;
    if (bookingLink.isTeamBooking && bookingLink.teamId) {
      if (!team) {
        team = await storage.getTeam(bookingLink.teamId);
      }
      if (team) {
        teamName = team.name;
      }
    }
    
    // Extract availability from the consolidated availability property
    let availableDays: string[] = ["1", "2", "3", "4", "5"]; // Default weekdays
    let availableHours: { start: string, end: string } = { start: "09:00", end: "17:00" }; // Default business hours
    
    // Get availability data from the availability JSON field
    try {
      const availabilityObj = bookingLink.availability as unknown;
      
      if (availabilityObj && typeof availabilityObj === 'object') {
        const availability = availabilityObj as Record<string, unknown>;
        
        // Extract days from availability.days
        if ('days' in availability && 
            availability.days && 
            Array.isArray(availability.days)) {
          availableDays = availability.days as string[];
        }
        
        // Extract hours from availability.hours
        if ('hours' in availability &&
            availability.hours && 
            typeof availability.hours === 'object' &&
            availability.hours !== null) {
          const hours = availability.hours as Record<string, unknown>;
          
          if ('start' in hours && 'end' in hours &&
              typeof hours.start === 'string' && 
              typeof hours.end === 'string') {
            availableHours = {
              start: hours.start,
              end: hours.end
            };
          }
        }
      }
    } catch (err) {
      console.error('Error parsing booking link availability:', err);
      // Use default values if there's any error in parsing
    }
    
    // Check if the owner has preferred timezone in settings
    const ownerSettings = owner ? await storage.getSettings(owner.id) : null;
    const preferredTimezone = ownerSettings?.preferredTimezone || (owner ? owner.timezone : null) || "UTC";
    
    // Get organization info if applicable
    if (team && team.organizationId) {
      organization = await storage.getOrganization(team.organizationId);
    } else if (owner && owner.organizationId) {
      organization = await storage.getOrganization(owner.organizationId);
    }
    
    // Fetch custom questions for the booking link
    const questions = await storage.getCustomQuestions(bookingLink.id);
    const enabledQuestions = questions.filter(q => q.enabled);

    // Check if one-off link has expired
    if (bookingLink.isOneOff && bookingLink.isExpired) {
      return res.status(410).json({ message: 'This booking link has expired after use' });
    }

    // Return booking link data without sensitive information
    res.json({
      id: bookingLink.id,
      title: bookingLink.title,
      description: bookingLink.description || "",
      duration: bookingLink.duration,
      availableDays: availableDays,
      availableHours: availableHours,
      ownerName: owner ? (owner.displayName || owner.username) : "Unknown",
      ownerTimezone: preferredTimezone,
      isTeamBooking: bookingLink.isTeamBooking || false,
      teamName: teamName,
      teamId: team ? team.id : null,
      organizationName: organization ? organization.name : null,
      organizationId: organization ? organization.id : null,
      ownerProfilePicture: owner ? owner.profilePicture : null,
      ownerAvatarColor: owner ? owner.avatarColor : null,
      customQuestions: enabledQuestions,
      // Phase 2: Branding
      brandLogo: bookingLink.brandLogo || null,
      brandColor: bookingLink.brandColor || null,
      removeBranding: bookingLink.removeBranding || false,
      // Phase 2: Post-booking
      redirectUrl: bookingLink.redirectUrl || null,
      confirmationMessage: bookingLink.confirmationMessage || null,
      confirmationCta: bookingLink.confirmationCta || null,
      // Phase 2: One-off
      isOneOff: bookingLink.isOneOff || false,
      // Phase 3: Payment
      requirePayment: bookingLink.requirePayment || false,
      price: bookingLink.price || null,
      currency: bookingLink.currency || 'usd',
      // Phase 3: Google Meet
      autoCreateMeetLink: bookingLink.autoCreateMeetLink || false,
    });
  } catch (error) {
    console.error('[BOOKING_PATH_GET] Error:', error);
    res.status(500).json({ 
      message: 'Error fetching booking link', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Create a booking - supports all path formats
 */
router.post('/:path(*)/booking/:slug', async (req, res) => {
  try {
    console.log('[BOOKING_PATH_POST] Received booking request');
    const fullPath = req.params.path;
    const slug = req.params.slug;
    
    console.log(`[BOOKING_PATH_POST] Processing booking request for path: ${fullPath}, slug: ${slug}`);
    
    // Parse the path to determine type (user, team, org)
    const parsedPath = parseBookingPath(`${fullPath}/booking/${slug}`);
    
    if (parsedPath.type === 'unknown' || !parsedPath.slug) {
      console.log(`[BOOKING_PATH_POST] Invalid path format: ${fullPath}`);
      return res.status(404).json({ message: 'Invalid booking link path' });
    }
    
    // Find the booking link
    const bookingLink = await storage.getBookingLinkBySlug(parsedPath.slug);
    
    if (!bookingLink) {
      console.log(`[BOOKING_PATH_POST] Booking link with slug ${parsedPath.slug} not found`);
      return res.status(404).json({ message: 'Booking link not found' });
    }
    
    // Handle different path types similar to GET
    let expectedPath = '';
    let owner = null;
    let team = null;
    
    if (parsedPath.type === 'user') {
      // User path type - get the owner and verify path
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        console.log(`[BOOKING_PATH_POST] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Generate expected user path
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      if (parsedPath.identifier !== userPath) {
        console.log(`[BOOKING_PATH_POST] User path mismatch: Expected ${userPath}, got ${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
    } 
    else if (parsedPath.type === 'team') {
      // Team path type - check if it's a team booking
      if (!bookingLink.isTeamBooking || !bookingLink.teamId) {
        console.log(`[BOOKING_PATH_POST] Booking link ${parsedPath.slug} is not a team booking`);
        
        // Find the owner and redirect to user path
        owner = await storage.getUser(bookingLink.userId);
        
        if (!owner) {
          console.log(`[BOOKING_PATH_POST] Owner with ID ${bookingLink.userId} not found`);
          return res.status(404).json({ message: 'Booking link owner not found' });
        }
        
        const userPath = await getUniqueUserPath(owner);
        expectedPath = `${userPath}/booking/${parsedPath.slug}`;
        
        console.log(`[BOOKING_PATH_POST] Redirecting team path to user path: ${expectedPath}`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
      
      // Get the team
      team = await storage.getTeam(bookingLink.teamId);
      
      if (!team) {
        console.log(`[BOOKING_PATH_POST] Team with ID ${bookingLink.teamId} not found`);
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Verify path
      const teamPath = await getUniqueTeamPath(team);
      expectedPath = `${teamPath}/booking/${parsedPath.slug}`;
      const expectedIdentifier = teamPath.replace('/booking', '');
      
      if (`team/${parsedPath.identifier}` !== expectedIdentifier) {
        console.log(`[BOOKING_PATH_POST] Team path mismatch: Expected ${expectedIdentifier}, got team/${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
      
      // Get the owner for processing
      owner = await storage.getUser(bookingLink.userId);
    }
    else if (parsedPath.type === 'org') {
      // Organization path type - currently redirect to user path
      console.log(`[BOOKING_PATH_POST] Organization path type is not fully implemented yet`);
      
      // Find the owner and redirect to user path
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        console.log(`[BOOKING_PATH_POST] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      console.log(`[BOOKING_PATH_POST] Redirecting org path to user path: ${expectedPath}`);
      return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}`
        });
      }
      
      // Check if booking link is active
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
      }
      
      // Log the received date data first
      console.log('[BOOKING_PATH_POST] Original startTime:', req.body.startTime);
      console.log('[BOOKING_PATH_POST] Original endTime:', req.body.endTime);
      
      // Parse the dates safely
      let parsedDates;
      try {
        parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
        console.log('[BOOKING_PATH_POST] Parsed dates successfully');
      } catch (dateError) {
        console.error('[BOOKING_PATH_POST] Date parsing error:', dateError);
        return res.status(400).json({ 
          message: 'Invalid date format in booking request',
          error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
        });
      }
      
      // Now validate with properly parsed Date objects
      let bookingData;
      try {
        bookingData = insertBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          bookingLinkId: bookingLink.id
        });
      } catch (validationError) {
        console.error('[BOOKING_PATH_POST] Validation error:', validationError);
        return res.status(400).json({ 
          message: 'Invalid booking data',
          error: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
      }
      
      // Use the parsed dates for further processing
      const startTime = parsedDates.startTime;
      const endTime = parsedDates.endTime;
      
      // Handle team booking assignment if needed
      let assignedUserId = bookingLink.userId; // Default to owner
      
      if (bookingLink.isTeamBooking && bookingLink.teamId) {
        console.log('[BOOKING_PATH_POST] Processing team booking assignment');
        
        try {
          if (bookingLink.assignmentMethod === 'round-robin') {
            console.log('[BOOKING_PATH_POST] Using round-robin assignment method');
            // Use round-robin scheduling
            assignedUserId = await teamSchedulingService.assignRoundRobin(
              bookingLink.teamId, 
              bookingLink.teamMemberIds as number[] || [],
              startTime
            );
          } 
          else {
            console.log('[BOOKING_PATH_POST] Using team scheduling service for assignment');
            // Use the team scheduling service to determine the assigned team member
            assignedUserId = await teamSchedulingService.assignTeamMember(
              bookingLink,
              startTime,
              endTime
            );
          }
          
          console.log(`[BOOKING_PATH_POST] Assigned team member: ${assignedUserId}`);
        } catch (assignmentError) {
          console.error('[BOOKING_PATH_POST] Team assignment error:', assignmentError);
          // If assignment fails, use the booking link owner as a fallback
          assignedUserId = bookingLink.userId;
          console.log(`[BOOKING_PATH_POST] Falling back to owner (${assignedUserId}) for assignment`);
        }
      }
      
      // Create the booking record
      const finalBookingData = {
        ...bookingData,
        assignedUserId // Include the assigned user ID
      };
      
      console.log('[BOOKING_PATH_POST] Creating booking with data:', JSON.stringify(finalBookingData, null, 2));
      
      // Check if one-off link has expired
      if (bookingLink.isOneOff && bookingLink.isExpired) {
        return res.status(410).json({ message: 'This booking link has expired after use' });
      }

      try {
        const booking = await storage.createBooking(finalBookingData);

        // If this is a one-off meeting link, mark it as expired
        if (bookingLink.isOneOff) {
          await storage.updateBookingLink(bookingLink.id, { isExpired: true });
        }

        // Phase 3: Auto-create Google Meet link if enabled
        let meetingUrl: string | null = null;
        if (bookingLink.autoCreateMeetLink) {
          try {
            meetingUrl = await createGoogleMeetLink(bookingLink.userId, {
              title: bookingLink.title,
              startTime: startTime,
              endTime: endTime,
              attendeeEmail: booking.email,
              attendeeName: booking.name,
            });
            if (meetingUrl) {
              await storage.updateBooking(booking.id, { meetingUrl });
              console.log(`[BOOKING_PATH_POST] Google Meet link created: ${meetingUrl}`);
            }
          } catch (meetError) {
            console.error('[BOOKING_PATH_POST] Google Meet auto-link error:', meetError);
          }
        }

        // Fetch the assigned user info for the response
        const assignedUser = await storage.getUser(assignedUserId);
        const assignedName = assignedUser
          ? (assignedUser.displayName || assignedUser.username)
          : 'Unknown';

        console.log(`[BOOKING_PATH_POST] Booking created successfully with ID ${booking.id}`);

        // Phase 3: Send Slack notification (async, don't block response)
        sendSlackNotification(bookingLink.userId, 'booking_created', {
          bookingName: booking.name,
          bookingEmail: booking.email,
          bookingTitle: bookingLink.title,
          startTime: startTime,
          meetingUrl,
        }).catch(err => console.error('[BOOKING_PATH_POST] Slack notification error:', err));

        res.status(201).json({
          ...booking,
          meetingUrl,
          assignedName,
          // Include post-booking info for the client
          redirectUrl: bookingLink.redirectUrl || null,
          confirmationMessage: bookingLink.confirmationMessage || null,
          confirmationCta: bookingLink.confirmationCta || null,
        });
      } catch (dbError) {
        console.error('[BOOKING_PATH_POST] Database error creating booking:', dbError);
        res.status(500).json({ 
          message: 'Error creating booking', 
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      }
    } catch (error) {
      console.error('[BOOKING_PATH_POST] Error:', error);
      res.status(500).json({ 
        message: 'Error processing booking request', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

/**
 * Get availability for a booking link - supports all path formats
 */
router.get('/:path(*)/booking/:slug/availability', async (req, res) => {
  try {
    const fullPath = req.params.path;
    const slug = req.params.slug;
    
    console.log(`[BOOKING_PATH_AVAIL] Processing availability request for path: ${fullPath}, slug: ${slug}`);
    
    // Parse the path to determine type (user, team, org)
    const parsedPath = parseBookingPath(`${fullPath}/booking/${slug}`);
    
    if (parsedPath.type === 'unknown' || !parsedPath.slug) {
      console.log(`[BOOKING_PATH_AVAIL] Invalid path format: ${fullPath}`);
      return res.status(404).json({ message: 'Invalid booking link path' });
    }
    
    // Find the booking link
    const bookingLink = await storage.getBookingLinkBySlug(parsedPath.slug);
    
    if (!bookingLink) {
      console.log(`[BOOKING_PATH_AVAIL] Booking link with slug ${parsedPath.slug} not found`);
      return res.status(404).json({ message: 'Booking link not found' });
    }
    
    // Get the date range from query parameters or use defaults
    const startDateStr = req.query.startDate as string || new Date().toISOString();
    const endDateStr = req.query.endDate as string;
    
    let startDate = new Date(startDateStr);
    let endDate: Date;
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
    } else {
      // Default to 30 days from startDate
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
    }
    
    // Get timezone from query parameters or use default
    const timezone = req.query.timezone as string || 'UTC';
    
    console.log(`[BOOKING_PATH_AVAIL] Date range: ${startDate.toISOString()} - ${endDate.toISOString()}, Timezone: ${timezone}`);
    
    // Different logic based on booking link type
    let availableSlots: { start: Date; end: Date }[] = [];
    
    // Handle team booking availability differently
    if (bookingLink.isTeamBooking && bookingLink.teamId) {
      // For team booking, we need to find common availability for team members
      console.log(`[BOOKING_PATH_AVAIL] Processing team availability for team ID: ${bookingLink.teamId}`);
      
      // Get the team members specified in the booking link
      const teamMemberIds = (bookingLink.teamMemberIds as number[]) || [];
      
      // If no team members specified, get all team members
      let memberIds = teamMemberIds;
      if (memberIds.length === 0) {
        const users = await storage.getUsersByTeam(bookingLink.teamId);
        memberIds = users.map(user => user.id);
      }
      
      console.log(`[BOOKING_PATH_AVAIL] Getting availability for ${memberIds.length} team members`);
      
      if (memberIds.length === 0) {
        // If still no team members, fall back to the booking link owner
        memberIds = [bookingLink.userId];
        console.log(`[BOOKING_PATH_AVAIL] No team members found, using owner ID: ${bookingLink.userId}`);
      }
      
      // Extract buffer times from booking link
      const bufferBefore = bookingLink.bufferBefore || 0;
      const bufferAfter = bookingLink.bufferAfter || 0;
      
      // Use the team scheduling service to find common availability
      availableSlots = await teamSchedulingService.findCommonAvailability(
        memberIds,
        startDate,
        endDate,
        bookingLink.duration,
        bufferBefore,
        bufferAfter,
        timezone,
        bookingLink.startTimeIncrement || 30,
        bookingLink.availabilityScheduleId,
        bookingLink.userId
      );
    } else {
      // For individual booking, get availability of the owner
      console.log(`[BOOKING_PATH_AVAIL] Processing individual availability for user ID: ${bookingLink.userId}`);

      // Extract buffer times from booking link
      const bufferBefore = bookingLink.bufferBefore || 0;
      const bufferAfter = bookingLink.bufferAfter || 0;

      // Use the team scheduling service but with just one user ID
      availableSlots = await teamSchedulingService.findCommonAvailability(
        [bookingLink.userId],
        startDate,
        endDate,
        bookingLink.duration,
        bufferBefore,
        bufferAfter,
        timezone,
        bookingLink.startTimeIncrement || 30,
        bookingLink.availabilityScheduleId,
        bookingLink.userId
      );
    }
    
    console.log(`[BOOKING_PATH_AVAIL] Found ${availableSlots.length} available slots`);
    
    // Return all available slots
    res.json(availableSlots);
    
  } catch (error) {
    console.error('[BOOKING_PATH_AVAIL] Error:', error);
    res.status(500).json({ 
      message: 'Error fetching availability', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;