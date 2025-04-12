import { Request, Response, Router } from 'express';
import { parseBookingDates } from '../utils/dateUtils';
import { storage } from '../storage';
import { insertBookingSchema } from '@shared/schema';
import { teamSchedulingService } from '../utils/teamSchedulingService';
import { getUniqueUserPath, getUniqueTeamPath, getUniqueOrganizationPath, parseBookingPath } from '../utils/pathUtils';

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
      ownerAvatarColor: owner ? owner.avatarColor : null
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
    
    // Calculate duration in minutes
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (durationMinutes !== bookingLink.duration) {
      return res.status(400).json({ message: 'Booking duration does not match expected duration' });
    }
    
    // Check if the booking respects the lead time (minimum notice)
    const now = new Date();
    const minutesUntilMeeting = (startTime.getTime() - now.getTime()) / (1000 * 60);
    
    const leadTime = bookingLink.leadTime ?? 0; // Default to 0 if null
    if (minutesUntilMeeting < leadTime) {
      return res.status(400).json({ 
        message: `Booking must be made at least ${leadTime} minutes in advance` 
      });
    }
    
    // For team bookings, assign to a team member based on assignment method
    let assignedUserId = bookingLink.userId; // Default to the owner
    
    if (bookingLink.isTeamBooking && bookingLink.teamId) {
      if (bookingLink.assignmentMethod === 'round-robin') {
        // Implement round-robin assignment logic
        assignedUserId = await teamSchedulingService.assignRoundRobin(
          bookingLink.teamId, 
          bookingLink.teamMemberIds as number[] || [],
          startTime
        );
      } 
      else if (bookingLink.assignmentMethod === 'specific' && 
              Array.isArray(bookingLink.teamMemberIds) && 
              bookingLink.teamMemberIds.length === 1) {
        // Specific team member assignment
        assignedUserId = bookingLink.teamMemberIds[0];
      }
    }
    
    // Create the booking
    const booking = await storage.createBooking({
      ...bookingData,
      assignedUserId
    });
    
    // Return the created booking
    res.status(201).json(booking);
  } catch (error) {
    console.error('[BOOKING_PATH_POST] Error:', error);
    res.status(500).json({ 
      message: 'Error creating booking', 
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
    const { startDate, endDate, timezone } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    console.log(`[BOOKING_PATH_AVAILABILITY] Processing availability request for path: ${fullPath}, slug: ${slug}`);
    
    // Parse the path to determine type (user, team, org)
    const parsedPath = parseBookingPath(`${fullPath}/booking/${slug}`);
    
    if (parsedPath.type === 'unknown' || !parsedPath.slug) {
      console.log(`[BOOKING_PATH_AVAILABILITY] Invalid path format: ${fullPath}`);
      return res.status(404).json({ message: 'Invalid booking link path' });
    }
    
    // Find the booking link
    const bookingLink = await storage.getBookingLinkBySlug(parsedPath.slug);
    
    if (!bookingLink) {
      console.log(`[BOOKING_PATH_AVAILABILITY] Booking link with slug ${parsedPath.slug} not found`);
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
        console.log(`[BOOKING_PATH_AVAILABILITY] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Generate expected user path
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      if (parsedPath.identifier !== userPath) {
        console.log(`[BOOKING_PATH_AVAILABILITY] User path mismatch: Expected ${userPath}, got ${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}/availability?startDate=${startDate}&endDate=${endDate}${timezone ? `&timezone=${timezone}` : ''}`
        });
      }
    } 
    else if (parsedPath.type === 'team') {
      // Team path type - check if it's a team booking
      if (!bookingLink.isTeamBooking || !bookingLink.teamId) {
        console.log(`[BOOKING_PATH_AVAILABILITY] Booking link ${parsedPath.slug} is not a team booking`);
        
        // Find the owner and redirect to user path
        owner = await storage.getUser(bookingLink.userId);
        
        if (!owner) {
          console.log(`[BOOKING_PATH_AVAILABILITY] Owner with ID ${bookingLink.userId} not found`);
          return res.status(404).json({ message: 'Booking link owner not found' });
        }
        
        const userPath = await getUniqueUserPath(owner);
        expectedPath = `${userPath}/booking/${parsedPath.slug}`;
        
        console.log(`[BOOKING_PATH_AVAILABILITY] Redirecting team path to user path: ${expectedPath}`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}/availability?startDate=${startDate}&endDate=${endDate}${timezone ? `&timezone=${timezone}` : ''}`
        });
      }
      
      // Get the team
      team = await storage.getTeam(bookingLink.teamId);
      
      if (!team) {
        console.log(`[BOOKING_PATH_AVAILABILITY] Team with ID ${bookingLink.teamId} not found`);
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Verify path
      const teamPath = await getUniqueTeamPath(team);
      expectedPath = `${teamPath}/booking/${parsedPath.slug}`;
      const expectedIdentifier = teamPath.replace('/booking', '');
      
      if (`team/${parsedPath.identifier}` !== expectedIdentifier) {
        console.log(`[BOOKING_PATH_AVAILABILITY] Team path mismatch: Expected ${expectedIdentifier}, got team/${parsedPath.identifier}. Redirecting.`);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedPath}/availability?startDate=${startDate}&endDate=${endDate}${timezone ? `&timezone=${timezone}` : ''}`
        });
      }
      
      // Get the owner for availability checks
      owner = await storage.getUser(bookingLink.userId);
    }
    else if (parsedPath.type === 'org') {
      // Organization path type - currently redirect to user path
      console.log(`[BOOKING_PATH_AVAILABILITY] Organization path type is not fully implemented yet`);
      
      // Find the owner and redirect to user path
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        console.log(`[BOOKING_PATH_AVAILABILITY] Owner with ID ${bookingLink.userId} not found`);
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      const userPath = await getUniqueUserPath(owner);
      expectedPath = `${userPath}/booking/${parsedPath.slug}`;
      
      console.log(`[BOOKING_PATH_AVAILABILITY] Redirecting org path to user path: ${expectedPath}`);
      return res.status(307).json({
        message: 'Redirecting to correct booking link path',
        redirectUrl: `/${expectedPath}/availability?startDate=${startDate}&endDate=${endDate}${timezone ? `&timezone=${timezone}` : ''}`
      });
    }
    
    // The rest of the availability calculation logic (existing implementation)
    // This would include checking calendar events, existing bookings, etc.
    // Return available time slots
    res.json({ 
      message: 'Availability endpoint working, implement actual availability logic',
      bookingLinkId: bookingLink.id,
      startDate,
      endDate,
      timezone
    });
    
  } catch (error) {
    console.error('[BOOKING_PATH_AVAILABILITY] Error:', error);
    res.status(500).json({ 
      message: 'Error fetching availability', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;