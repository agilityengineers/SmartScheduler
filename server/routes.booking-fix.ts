/**
 * Fixed version of the booking endpoint with proper date handling
 * This fixes the "Expected date, received string" validation error
 */

// Add this import at the top of the file  
import { z } from "zod"; 

// Use this helper function before the route registration
function ensureDate(input: string | Date): Date {
  if (typeof input === 'string') {
    return new Date(input);
  }
  return input;
}

// Replace the existing POST endpoint for userPath booking with this fixed version
app.post('/api/public/:userPath/booking/:slug', async (req, res) => {
  try {
    console.log('[USER_PATH_BOOKING] Received booking request');
    console.log('[USER_PATH_BOOKING] Request body:', JSON.stringify(req.body));
    const { userPath, slug } = req.params;
    console.log(`[USER_PATH_BOOKING] User path: ${userPath}, slug: ${slug}`);
    
    // Find the booking link
    const bookingLink = await storage.getBookingLinkBySlug(slug);
    
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    
    // Get the owner's information
    const owner = await storage.getUser(bookingLink.userId);
    
    if (!owner) {
      return res.status(404).json({ message: 'Booking link owner not found' });
    }
    
    // Generate the expected user path
    const expectedUserPath = await getUniqueUserPath(owner);
    
    // Verify that the userPath in the URL matches the owner's path
    if (userPath !== expectedUserPath) {
      return res.status(404).json({ message: 'Booking link not found' });
    }
    
    // Now proceed with the same logic as the original booking creation
    
    // Check if booking link is active (if property exists)
    const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
    
    if (!isActive) {
      return res.status(404).json({ message: 'Booking link is inactive' });
    }
    
    // Create an enhanced schema with date conversion
    const enhancedBookingSchema = z.object({
      bookingLinkId: z.number(),
      name: z.string(),
      email: z.string().email(),
      startTime: z.union([
        z.string().transform(val => new Date(val)),
        z.date()
      ]),
      endTime: z.union([
        z.string().transform(val => new Date(val)),
        z.date()
      ]),
      notes: z.string().optional(),
      status: z.string().optional(),
      eventId: z.number().optional(),
      assignedUserId: z.number().optional()
    });

    // Validate and convert date strings to Date objects
    let bookingData;
    try {
      bookingData = enhancedBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        bookingLinkId: bookingLink.id
      });
      
      console.log('[USER_PATH_BOOKING] Successfully parsed booking data with dates', {
        startTime: bookingData.startTime instanceof Date ? bookingData.startTime.toISOString() : 'Not a date',
        endTime: bookingData.endTime instanceof Date ? bookingData.endTime.toISOString() : 'Not a date'
      });
    } catch (error) {
      console.error('[USER_PATH_BOOKING] Validation error:', error);
      return res.status(400).json({ 
        message: 'Invalid booking data', 
        error: error instanceof Error ? error.message : 'Validation failed' 
      });
    }
    
    // Now we have proper Date objects for startTime and endTime
    const startTime = bookingData.startTime;
    const endTime = bookingData.endTime;
    
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
    
    // Check if there are any existing bookings for this user on the same day
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(startTime);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Get all events for the user on this day
    const userEvents = await storage.getEvents(bookingLink.userId, dayStart, dayEnd);
    
    // Check max bookings per day limit
    const maxBookingsPerDay = bookingLink.maxBookingsPerDay ?? 0; // Default to 0 if null
    if (maxBookingsPerDay > 0) {
      const existingBookingsCount = userEvents.length;
      
      if (existingBookingsCount >= maxBookingsPerDay) {
        return res.status(400).json({ 
          message: `Maximum number of bookings for this day has been reached` 
        });
      }
    }
    
    // Check for conflicts with existing events, considering buffer times
    const bufferBefore = bookingLink.bufferBefore ?? 0; // Default to 0 if null
    const bufferAfter = bookingLink.bufferAfter ?? 0; // Default to 0 if null
    
    // Adjust booking time to include buffers
    const bookingStartWithBuffer = new Date(startTime.getTime() - bufferBefore * 60 * 1000);
    const bookingEndWithBuffer = new Date(endTime.getTime() + bufferAfter * 60 * 1000);
    
    // Check for conflicts
    const hasConflict = userEvents.some(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      // Check if there's an overlap
      return (
        (bookingStartWithBuffer <= eventEnd && bookingEndWithBuffer >= eventStart)
      );
    });
    
    if (hasConflict) {
      return res.status(400).json({ message: 'The selected time slot conflicts with an existing event' });
    }
    
    // Handle team booking assignment if applicable
    let assignedUserId = bookingLink.userId; // Default to the booking link owner
    
    if (bookingLink.isTeamBooking && Array.isArray(bookingLink.teamMemberIds) && bookingLink.teamMemberIds.length > 0) {
      const teamMemberIds = bookingLink.teamMemberIds;
      
      // Get team members info, if this is a team booking
      if (bookingLink.assignmentMethod === 'round-robin') {
        // Simple round-robin: get the team member with the fewest bookings today
        const teamMemberBookings = new Map();
        
        // Initialize all team members with 0 bookings
        teamMemberIds.forEach(memberId => {
          teamMemberBookings.set(memberId, 0);
        });
        
        // Count bookings for each team member
        for (const event of userEvents) {
          if (event.assignedUserId && teamMemberIds.includes(event.assignedUserId)) {
            teamMemberBookings.set(
              event.assignedUserId, 
              (teamMemberBookings.get(event.assignedUserId) || 0) + 1
            );
          }
        }
        
        // Find the team member with the fewest bookings
        let minBookings = Infinity;
        let minBookingsMemberId = assignedUserId;
        
        teamMemberBookings.forEach((bookingsCount, memberId) => {
          if (bookingsCount < minBookings) {
            minBookings = bookingsCount;
            minBookingsMemberId = memberId;
          }
        });
        
        assignedUserId = minBookingsMemberId;
      } else if (bookingLink.assignmentMethod === 'specific' && bookingData.assignedUserId) {
        // Check if the assigned user is part of the team
        if (teamMemberIds.includes(bookingData.assignedUserId)) {
          assignedUserId = bookingData.assignedUserId;
        }
      }
    }
    
    // Create the booking in the database
    const booking = await storage.createBooking({
      ...bookingData,
      assignedUserId
    });
    
    // Create a calendar event for this booking
    let eventId = null;
    try {
      // Format the title/description for the calendar event
      const eventTitle = `Meeting with ${booking.name}`;
      const eventDescription = booking.notes 
        ? `Booking notes: ${booking.notes}` 
        : 'No additional notes provided.';
      
      // Create the event
      const event = await storage.createEvent({
        userId: assignedUserId,
        title: eventTitle,
        description: eventDescription,
        startTime: startTime,
        endTime: endTime,
        attendees: [{ email: booking.email, name: booking.name }],
        location: bookingLink.location,
        meetingUrl: bookingLink.meetingUrl
      });
      
      eventId = event.id;
      
      // Update the booking with the event ID
      await storage.updateBooking(booking.id, { eventId });
    } catch (error) {
      console.error('[USER_PATH_BOOKING] Error creating calendar event:', error);
      // We still consider the booking successful even if event creation fails
    }
    
    // Send confirmation emails
    try {
      // Get the owner's settings to check if email notifications are enabled
      const ownerSettings = await storage.getSettings(owner.id);
      
      if (!ownerSettings || ownerSettings.emailNotifications !== false) {
        await sendNotificationEmail({
          to: owner.email,
          subject: `New booking: ${booking.name} - ${formatDate(startTime)}`,
          html: getNewBookingHtml(booking, bookingLink, owner, startTime, endTime)
        });
      }
      
      // Send confirmation to the person who booked
      await sendNotificationEmail({
        to: booking.email,
        subject: `Booking confirmation: ${formatDate(startTime)}`,
        html: getBookingConfirmationHtml(booking, bookingLink, owner, startTime, endTime)
      });
    } catch (error) {
      console.error('[USER_PATH_BOOKING] Error sending notification emails:', error);
      // We still consider the booking successful even if notification fails
    }
    
    return res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        ...booking,
        formattedStartTime: formatDate(startTime),
        formattedEndTime: formatDate(endTime)
      }
    });
  } catch (error) {
    console.error('[USER_PATH_BOOKING] Error creating booking:', error);
    return res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});