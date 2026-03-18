import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { parseBookingDates } from '../utils/dateUtils';
import { storage } from '../storage';
import { insertBookingSchema } from '@shared/schema';
import { teamSchedulingService } from '../utils/teamSchedulingService';
import { getUniqueUserPath, getUniqueTeamPath, getUniqueOrganizationPath, parseBookingPath, slugifyName } from '../utils/pathUtils';
import { sendSlackNotification } from '../utils/slackNotificationService';
import { createGoogleMeetLink } from '../utils/googleMeetService';
import { pool } from '../db';

/**
 * Calculate the time offset for a recurring booking instance
 */
function getRecurringOffset(frequency: string, instanceNumber: number): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  switch (frequency) {
    case 'daily': return instanceNumber * DAY_MS;
    case 'weekly': return instanceNumber * 7 * DAY_MS;
    case 'biweekly': return instanceNumber * 14 * DAY_MS;
    case 'monthly': return instanceNumber * 30 * DAY_MS; // Approximate
    default: return instanceNumber * 7 * DAY_MS;
  }
}

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
    else if (parsedPath.type === 'combined') {
      if (!bookingLink.isTeamBooking || !bookingLink.teamId) {
        owner = await storage.getUser(bookingLink.userId);
        if (!owner) {
          return res.status(404).json({ message: 'Booking link owner not found' });
        }
        const userPath = await getUniqueUserPath(owner);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${userPath}/booking/${parsedPath.slug}`
        });
      }

      team = await storage.getTeam(bookingLink.teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      if (team.organizationId) {
        organization = await storage.getOrganization(team.organizationId);
      }

      const teamSlug = slugifyName(team.name);

      if (organization) {
        const orgSlug = slugifyName(organization.name);

        if (parsedPath.identifier !== orgSlug || parsedPath.secondaryIdentifier !== teamSlug) {
          return res.status(307).json({
            message: 'Redirecting to correct booking link path',
            redirectUrl: `/${orgSlug}/${teamSlug}/booking/${parsedPath.slug}`
          });
        }
      } else {
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/team/${teamSlug}/booking/${parsedPath.slug}`
        });
      }

      owner = await storage.getUser(bookingLink.userId);
    }
    else if (parsedPath.type === 'org') {
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      const userPath = await getUniqueUserPath(owner);
      
      return res.status(307).json({
        message: 'Redirecting to correct booking link path',
        redirectUrl: `/${userPath}/booking/${parsedPath.slug}`
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

    // Phase 7: Check if owner is out of office
    let outOfOfficeInfo: any = null;
    try {
      const today = new Date().toISOString().split('T')[0];
      const oooEntries = await storage.getOutOfOfficeEntries(bookingLink.userId);
      const activeOOO = oooEntries.find(entry =>
        entry.isActive && entry.startDate <= today && entry.endDate >= today
      );
      if (activeOOO) {
        outOfOfficeInfo = {
          isOutOfOffice: true,
          message: activeOOO.message || `This person is out of office until ${activeOOO.endDate}.`,
          endDate: activeOOO.endDate,
          reason: activeOOO.reason,
        };
        // If redirecting to another user's booking link
        if (activeOOO.redirectToBookingLinkSlug) {
          outOfOfficeInfo.redirectSlug = activeOOO.redirectToBookingLinkSlug;
        }
        if (activeOOO.redirectToUserId) {
          const redirectUser = await storage.getUser(activeOOO.redirectToUserId);
          if (redirectUser) {
            outOfOfficeInfo.redirectUserName = redirectUser.displayName || redirectUser.username;
            outOfOfficeInfo.redirectUserId = redirectUser.id;
          }
        }
      }
    } catch (oooError) {
      console.error('[BOOKING_PATH_GET] OOO check error:', oooError);
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
      // Meeting type
      meetingType: bookingLink.meetingType || 'in-person',
      location: bookingLink.meetingType === 'in-person' ? (bookingLink.location || null) : null,
      meetingUrl: bookingLink.meetingType === 'custom' ? (bookingLink.meetingUrl || null) : null,
      // Phase 3: Google Meet
      autoCreateMeetLink: bookingLink.autoCreateMeetLink || false,
      // Phase 5: Hybrid collective + round-robin
      isCollective: bookingLink.isCollective || false,
      collectiveMemberIds: bookingLink.collectiveMemberIds || [],
      rotatingMemberIds: bookingLink.rotatingMemberIds || [],
      // Phase 6: Requires Confirmation
      requiresConfirmation: bookingLink.requiresConfirmation || false,
      // Phase 6: Seats / Group Bookings
      maxSeats: bookingLink.maxSeats ?? 0,
      // Phase 7: Recurring Bookings
      allowRecurring: bookingLink.allowRecurring || false,
      recurringOptions: bookingLink.recurringOptions || { maxOccurrences: 12, frequencies: ['weekly'] },
      // Phase 7: Out-of-Office
      outOfOffice: outOfOfficeInfo,
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
    else if (parsedPath.type === 'combined') {
      if (!bookingLink.isTeamBooking || !bookingLink.teamId) {
        owner = await storage.getUser(bookingLink.userId);
        if (!owner) {
          return res.status(404).json({ message: 'Booking link owner not found' });
        }
        const userPath = await getUniqueUserPath(owner);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${userPath}/booking/${parsedPath.slug}`
        });
      }

      team = await storage.getTeam(bookingLink.teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      if (team.organizationId) {
        const org = await storage.getOrganization(team.organizationId);
        if (org) {
          const orgSlug = slugifyName(org.name);
          const teamSlug = slugifyName(team.name);

          if (parsedPath.identifier !== orgSlug || parsedPath.secondaryIdentifier !== teamSlug) {
            return res.status(307).json({
              message: 'Redirecting to correct booking link path',
              redirectUrl: `/${orgSlug}/${teamSlug}/booking/${parsedPath.slug}`
            });
          }
        }
      } else {
        const teamSlug = slugifyName(team.name);
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/team/${teamSlug}/booking/${parsedPath.slug}`
        });
      }

      owner = await storage.getUser(bookingLink.userId);
    }
    else if (parsedPath.type === 'org') {
      owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      const userPath = await getUniqueUserPath(owner);
      
      return res.status(307).json({
        message: 'Redirecting to correct booking link path',
        redirectUrl: `/${userPath}/booking/${parsedPath.slug}`
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

      // Calculate duration in minutes (use Math.round to avoid floating-point mismatch)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      if (Math.abs(durationMinutes - bookingLink.duration) > 1) {
        return res.status(400).json({ message: 'Booking duration does not match expected duration' });
      }

      // Check if the booking respects the lead time (minimum notice)
      const now = new Date();
      const minutesUntilMeeting = (startTime.getTime() - now.getTime()) / (1000 * 60);

      const leadTime = bookingLink.leadTime ?? 0;
      if (minutesUntilMeeting < leadTime) {
        return res.status(400).json({
          message: `Booking must be made at least ${leadTime} minutes in advance`
        });
      }

      // Use advisory lock to prevent double-booking race condition
      const lockKey = bookingLink.id;
      let lockAcquired = false;

      try {
        await pool.query('SELECT pg_advisory_lock($1)', [lockKey]);
        lockAcquired = true;

      // Check max bookings per day using actual bookings (not all calendar events)
      const dayStart = new Date(startTime);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(startTime);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const maxBookingsPerDay = bookingLink.maxBookingsPerDay ?? 0;
      const existingBookings = await storage.getBookings(bookingLink.id);

      if (maxBookingsPerDay > 0) {
        const dayBookingsCount = existingBookings.filter(b => {
          const bs = new Date(b.startTime);
          return bs >= dayStart && bs <= dayEnd && b.status !== 'cancelled' && b.status !== 'rescheduled';
        }).length;

        if (dayBookingsCount >= maxBookingsPerDay) {
          return res.status(400).json({
            message: `Maximum number of bookings for this day has been reached`
          });
        }
      }

      // Check for conflicts with existing events, considering buffer times
      const bufferBefore = bookingLink.bufferBefore ?? 0;
      const bufferAfter = bookingLink.bufferAfter ?? 0;

      const bufferBeforeTime = new Date(startTime.getTime() - bufferBefore * 60 * 1000);
      const bufferAfterTime = new Date(endTime.getTime() + bufferAfter * 60 * 1000);

      const userEvents = await storage.getEvents(bookingLink.userId, dayStart, dayEnd);
      const hasConflict = userEvents.some(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return (bufferBeforeTime < eventEnd && bufferAfterTime > eventStart);
      });

      if (hasConflict) {
        return res.status(400).json({
          message: `This time slot conflicts with an existing event (including buffer time)`
        });
      }

      // Check weekly/monthly booking caps
      if (bookingLink.maxBookingsPerWeek && bookingLink.maxBookingsPerWeek > 0) {
        const weekStart = new Date(startTime);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekBookings = existingBookings.filter(b => {
          const bs = new Date(b.startTime);
          return bs >= weekStart && bs < weekEnd && b.status !== 'cancelled';
        });
        if (weekBookings.length >= bookingLink.maxBookingsPerWeek) {
          return res.status(400).json({ message: 'Weekly booking limit reached for this booking link' });
        }
      }

      if (bookingLink.maxBookingsPerMonth && bookingLink.maxBookingsPerMonth > 0) {
        const monthStart = new Date(startTime.getFullYear(), startTime.getMonth(), 1);
        const monthEnd = new Date(startTime.getFullYear(), startTime.getMonth() + 1, 1);
        const monthBookings = existingBookings.filter(b => {
          const bs = new Date(b.startTime);
          return bs >= monthStart && bs < monthEnd && b.status !== 'cancelled';
        });
        if (monthBookings.length >= bookingLink.maxBookingsPerMonth) {
          return res.status(400).json({ message: 'Monthly booking limit reached for this booking link' });
        }
      }

      // Handle team booking assignment if needed
      let assignedUserId = bookingLink.userId; // Default to owner
      let collectiveAttendeeIds: number[] = [];
      let roundRobinGroupAssignments: { groupName: string; assignedUserId: number }[] = [];

      // Phase 7: Round-Robin Groups - check if this booking link uses group-based assignment
      const roundRobinGroups = (bookingLink.roundRobinGroups as Array<{ name: string; memberIds: number[] }>) || [];
      if (bookingLink.isTeamBooking && roundRobinGroups.length > 0) {
        try {
          roundRobinGroupAssignments = await teamSchedulingService.assignRoundRobinGroups(
            bookingLink, startTime, endTime
          );
          // Primary assigned user is from the first group
          if (roundRobinGroupAssignments.length > 0) {
            assignedUserId = roundRobinGroupAssignments[0].assignedUserId;
            // All group assignees become collective attendees
            collectiveAttendeeIds = roundRobinGroupAssignments.map(g => g.assignedUserId);
          }
          console.log(`[BOOKING_PATH_POST] Round-robin groups assigned: ${JSON.stringify(roundRobinGroupAssignments)}`);
        } catch (groupError) {
          console.error('[BOOKING_PATH_POST] Round-robin group assignment error:', groupError);
          // Fall through to standard assignment
        }
      }

      if (bookingLink.isTeamBooking && bookingLink.teamId && roundRobinGroupAssignments.length === 0) {
        console.log('[BOOKING_PATH_POST] Processing team booking assignment');

        const collectiveIds = (bookingLink.collectiveMemberIds as number[]) || [];
        const rotatingIds = (bookingLink.rotatingMemberIds as number[]) || [];
        const isHybrid = collectiveIds.length > 0 && rotatingIds.length > 0;

        if (isHybrid) {
          // Hybrid Collective + Round Robin: collective members all attend, one rotating member assigned
          console.log(`[BOOKING_PATH_POST] Hybrid model: ${collectiveIds.length} collective + ${rotatingIds.length} rotating`);
          collectiveAttendeeIds = [...collectiveIds];

          try {
            // Find which rotating members are available at this time
            const hybridSlots = await teamSchedulingService.findHybridAvailability(
              collectiveIds, rotatingIds, startTime, endTime,
              bookingLink.duration, bookingLink.bufferBefore || 0, bookingLink.bufferAfter || 0,
              'UTC', 30, bookingLink.availabilityScheduleId, bookingLink.userId
            );
            const matchingSlot = hybridSlots.find(s =>
              s.start.getTime() === startTime.getTime()
            );
            const availableRotating = matchingSlot?.availableRotatingMembers || rotatingIds;

            assignedUserId = await teamSchedulingService.assignHybridRotatingMember(
              bookingLink, availableRotating, startTime
            );
            collectiveAttendeeIds.push(assignedUserId);
            console.log(`[BOOKING_PATH_POST] Hybrid assigned rotating member: ${assignedUserId}, all attendees: ${collectiveAttendeeIds}`);
          } catch (hybridError) {
            console.error('[BOOKING_PATH_POST] Hybrid assignment error:', hybridError);
            assignedUserId = rotatingIds[0] || bookingLink.userId;
            collectiveAttendeeIds.push(assignedUserId);
          }
        } else if (bookingLink.isCollective) {
          // Pure collective: all team members must attend (no round-robin)
          console.log('[BOOKING_PATH_POST] Collective event - all team members will attend');
          const teamMemberIds = (bookingLink.teamMemberIds as number[]) || [];
          collectiveAttendeeIds = [...teamMemberIds];
          assignedUserId = bookingLink.userId; // Owner is the primary
        } else {
          // Standard assignment (round-robin, pooled, etc.)
          try {
            if (bookingLink.assignmentMethod === 'round-robin') {
              console.log('[BOOKING_PATH_POST] Using round-robin assignment method');
              assignedUserId = await teamSchedulingService.assignRoundRobin(
                bookingLink.teamId,
                bookingLink.teamMemberIds as number[] || [],
                startTime
              );
            }
            else {
              console.log('[BOOKING_PATH_POST] Using team scheduling service for assignment');
              assignedUserId = await teamSchedulingService.assignTeamMember(
                bookingLink,
                startTime,
                endTime
              );
            }

            console.log(`[BOOKING_PATH_POST] Assigned team member: ${assignedUserId}`);
          } catch (assignmentError) {
            console.error('[BOOKING_PATH_POST] Team assignment error:', assignmentError);
            assignedUserId = bookingLink.userId;
            console.log(`[BOOKING_PATH_POST] Falling back to owner (${assignedUserId}) for assignment`);
          }
        }
      }

      // Phase 6: Seats / Group Bookings - check seat availability for this time slot
      const maxSeats = bookingLink.maxSeats ?? 0;
      if (maxSeats > 0) {
        const slotBookings = existingBookings.filter(b => {
          const bs = new Date(b.startTime).getTime();
          return bs === startTime.getTime() && b.status !== 'cancelled' && b.status !== 'declined';
        });
        if (slotBookings.length >= maxSeats) {
          return res.status(400).json({
            message: `This time slot is fully booked (${maxSeats} seats filled)`
          });
        }
      }

      // Phase 6: Requires Confirmation - set status to pending and generate token
      const requiresConfirmation = bookingLink.requiresConfirmation ?? false;
      const bookingStatus = requiresConfirmation ? 'pending' : 'confirmed';
      const confirmationToken = requiresConfirmation ? crypto.randomBytes(32).toString('hex') : undefined;

      // Create the booking record
      const finalBookingData = {
        ...bookingData,
        assignedUserId,
        collectiveAttendeeIds: collectiveAttendeeIds.length > 0 ? collectiveAttendeeIds : [],
        status: bookingStatus,
        ...(confirmationToken ? { confirmationToken } : {}),
      };

      console.log('[BOOKING_PATH_POST] Creating booking with data:', JSON.stringify(finalBookingData, null, 2));

      // Check if one-off link has expired
      if (bookingLink.isOneOff && bookingLink.isExpired) {
        return res.status(410).json({ message: 'This booking link has expired after use' });
      }

      try {
        // Phase 7: Recurring Bookings - generate recurring group ID and tag first booking
        const recurringData = req.body.recurring; // { frequency, count }
        const allowRecurring = bookingLink.allowRecurring ?? false;
        let recurringGroupId: string | undefined;
        let recurringBookings: any[] = [];

        if (recurringData && allowRecurring && recurringData.frequency && recurringData.count > 1) {
          const options = (bookingLink.recurringOptions as any) || { maxOccurrences: 12, frequencies: ['weekly'] };
          const allowedFrequencies = options.frequencies || ['weekly'];
          const maxOccurrences = options.maxOccurrences || 12;

          if (!allowedFrequencies.includes(recurringData.frequency)) {
            return res.status(400).json({ message: `Frequency '${recurringData.frequency}' is not allowed for this booking link` });
          }

          const count = Math.min(recurringData.count, maxOccurrences);
          recurringGroupId = crypto.randomBytes(16).toString('hex');

          // Tag the first booking with recurring info
          finalBookingData.recurringGroupId = recurringGroupId;
          finalBookingData.recurringFrequency = recurringData.frequency;
          finalBookingData.recurringCount = count;
          finalBookingData.recurringIndex = 1;
        }

        const booking = await storage.createBooking(finalBookingData);

        // Phase 7: Create additional recurring booking instances
        if (recurringGroupId && recurringData) {
          const count = Math.min(recurringData.count, ((bookingLink.recurringOptions as any)?.maxOccurrences || 12));

          for (let i = 2; i <= count; i++) {
            const offsetMs = getRecurringOffset(recurringData.frequency, i - 1);
            const recurStart = new Date(startTime.getTime() + offsetMs);
            const recurEnd = new Date(endTime.getTime() + offsetMs);

            try {
              const recurBooking = await storage.createBooking({
                ...finalBookingData,
                startTime: recurStart,
                endTime: recurEnd,
                recurringIndex: i,
              });
              recurringBookings.push(recurBooking);
            } catch (recurError) {
              console.error(`[BOOKING_PATH_POST] Failed to create recurring booking ${i}/${count}:`, recurError);
              // Continue creating remaining bookings even if one fails
            }
          }
          console.log(`[BOOKING_PATH_POST] Created ${recurringBookings.length + 1} recurring bookings in group ${recurringGroupId}`);
        }

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
          // Phase 6: Requires Confirmation info
          requiresConfirmation: requiresConfirmation,
          isPending: bookingStatus === 'pending',
          // Phase 6: Seats info
          maxSeats: maxSeats > 0 ? maxSeats : null,
          // Phase 7: Recurring info
          recurringGroupId: recurringGroupId || null,
          recurringCount: recurringGroupId ? (recurringBookings.length + 1) : null,
        });
      } catch (dbError) {
        console.error('[BOOKING_PATH_POST] Database error creating booking:', dbError);
        res.status(500).json({
          message: 'Error creating booking',
          error: dbError instanceof Error ? dbError.message : 'Database error'
        });
      }

      } finally {
        // Always release the advisory lock
        if (lockAcquired) {
          await pool.query('SELECT pg_advisory_unlock($1)', [lockKey]);
        }
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
      console.log(`[BOOKING_PATH_AVAIL] Processing team availability for team ID: ${bookingLink.teamId}`);

      const collectiveIds = (bookingLink.collectiveMemberIds as number[]) || [];
      const rotatingIds = (bookingLink.rotatingMemberIds as number[]) || [];
      const isHybrid = collectiveIds.length > 0 && rotatingIds.length > 0;

      const bufferBefore = bookingLink.bufferBefore || 0;
      const bufferAfter = bookingLink.bufferAfter || 0;

      if (isHybrid) {
        // Hybrid: intersect collective calendars, filter by rotating availability
        console.log(`[BOOKING_PATH_AVAIL] Hybrid model: ${collectiveIds.length} collective + ${rotatingIds.length} rotating`);
        const hybridSlots = await teamSchedulingService.findHybridAvailability(
          collectiveIds, rotatingIds,
          startDate, endDate, bookingLink.duration,
          bufferBefore, bufferAfter, timezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId, bookingLink.userId
        );
        // Convert to standard slot format (drop rotating member info for client)
        availableSlots = hybridSlots.map(s => ({ start: s.start, end: s.end }));
      } else {
        // Standard team: get common availability for all members
        const teamMemberIds = (bookingLink.teamMemberIds as number[]) || [];
        let memberIds = teamMemberIds;
        if (memberIds.length === 0) {
          const users = await storage.getUsersByTeam(bookingLink.teamId);
          memberIds = users.map(user => user.id);
        }

        if (memberIds.length === 0) {
          memberIds = [bookingLink.userId];
        }

        availableSlots = await teamSchedulingService.findCommonAvailability(
          memberIds, startDate, endDate, bookingLink.duration,
          bufferBefore, bufferAfter, timezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId, bookingLink.userId
        );
      }
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

/**
 * Phase 6: Accept a pending booking (public endpoint using confirmation token)
 */
router.post('/bookings/:bookingId/accept', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { token } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    // Verify by token (public) or by authenticated user ownership
    if (token) {
      if (booking.confirmationToken !== token) {
        return res.status(403).json({ message: 'Invalid confirmation token' });
      }
    } else if ((req as any).userId) {
      const bookingLink = await storage.getBookingLink(booking.bookingLinkId);
      if (!bookingLink || bookingLink.userId !== (req as any).userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(401).json({ message: 'Authentication or token required' });
    }

    const updated = await storage.updateBooking(bookingId, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    // Send Slack notification for acceptance
    const bookingLink = await storage.getBookingLink(booking.bookingLinkId);
    if (bookingLink) {
      sendSlackNotification(bookingLink.userId, 'booking_created', {
        bookingName: booking.name,
        bookingEmail: booking.email,
        bookingTitle: bookingLink.title,
        startTime: booking.startTime,
      }).catch(err => console.error('[BOOKING_ACCEPT] Slack notification error:', err));
    }

    res.json({ ...updated, message: 'Booking confirmed successfully' });
  } catch (error) {
    console.error('[BOOKING_ACCEPT] Error:', error);
    res.status(500).json({ message: 'Error accepting booking', error: (error as Error).message });
  }
});

/**
 * Phase 6: Decline a pending booking (public endpoint using confirmation token)
 */
router.post('/bookings/:bookingId/decline', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { token, reason } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    // Verify by token (public) or by authenticated user ownership
    if (token) {
      if (booking.confirmationToken !== token) {
        return res.status(403).json({ message: 'Invalid confirmation token' });
      }
    } else if ((req as any).userId) {
      const bookingLink = await storage.getBookingLink(booking.bookingLinkId);
      if (!bookingLink || bookingLink.userId !== (req as any).userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(401).json({ message: 'Authentication or token required' });
    }

    const updated = await storage.updateBooking(bookingId, {
      status: 'declined',
      declinedAt: new Date(),
      declineReason: reason || null,
    });

    res.json({ ...updated, message: 'Booking declined' });
  } catch (error) {
    console.error('[BOOKING_DECLINE] Error:', error);
    res.status(500).json({ message: 'Error declining booking', error: (error as Error).message });
  }
});

/**
 * Phase 6: Get seat availability for a specific time slot
 */
router.get('/:path(*)/booking/:slug/seats', async (req, res) => {
  try {
    const slug = req.params.slug;
    const { startTime: startTimeStr } = req.query;

    const bookingLink = await storage.getBookingLinkBySlug(slug as string);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }

    const maxSeats = bookingLink.maxSeats ?? 0;
    if (maxSeats === 0) {
      return res.json({ maxSeats: 0, seatsAvailable: 0, seatsBooked: 0 });
    }

    if (!startTimeStr) {
      return res.status(400).json({ message: 'startTime query parameter required' });
    }

    const startTime = new Date(startTimeStr as string);
    const existingBookings = await storage.getBookings(bookingLink.id);
    const slotBookings = existingBookings.filter(b => {
      const bs = new Date(b.startTime).getTime();
      return bs === startTime.getTime() && b.status !== 'cancelled' && b.status !== 'declined';
    });

    res.json({
      maxSeats,
      seatsBooked: slotBookings.length,
      seatsAvailable: maxSeats - slotBookings.length,
    });
  } catch (error) {
    console.error('[BOOKING_SEATS] Error:', error);
    res.status(500).json({ message: 'Error fetching seat availability', error: (error as Error).message });
  }
});

export default router;