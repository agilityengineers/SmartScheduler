// This file contains a fixed version of the booking route
// It can be used to replace the buggy booking route in routes.ts

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { getUniqueUserPath } from "./utils/pathUtils";
import { parseBookingDates } from "./utils/dateUtils";
import { insertBookingSchema, User } from "@shared/schema";
import { teamSchedulingService } from "./utils/teamSchedulingService";
import { GoogleCalendarService } from "./calendarServices/googleCalendar";
import { OutlookCalendarService } from "./calendarServices/outlookCalendar";
import { reminderService } from "./utils/reminderService";
import { emailService } from "./utils/emailService";

function formatDate(date: Date, type?: string): string {
  if (type === 'time') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function sendNotificationEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  await emailService.sendEmail({ to, subject, text, html });
}

function getBookingConfirmationHtml(bookingData: any, assignee: User, startTime: Date, endTime: Date, title: string): string {
  return `<h1>Booking Confirmed</h1><p>Your booking "${title}" with ${assignee.firstName} ${assignee.lastName} has been confirmed for ${formatDate(startTime)} at ${formatDate(endTime, 'time')}.</p>`;
}

function getNewBookingHtml(bookingData: any, startTime: Date, endTime: Date): string {
  return `<h1>New Booking</h1><p>${bookingData.name} has booked a meeting with you for ${formatDate(startTime)} at ${formatDate(endTime, 'time')}.</p>`;
}

async function isUserAvailable(userId: number, startTime: Date, endTime: Date): Promise<{ available: boolean }> {
  const events = await storage.getEvents(userId, startTime, endTime);
  const hasConflict = events.some(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    return (startTime < eventEnd && endTime > eventStart);
  });
  return { available: !hasConflict };
}

export default function registerBookingFixRoutes(app: Express) {
app.post('/api/public/:userPath/booking/:slug', async (req: Request, res: Response) => {
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
    
    // Parse the dates safely first
    console.log('[USER_PATH_BOOKING] Original startTime:', req.body.startTime);
    console.log('[USER_PATH_BOOKING] Original endTime:', req.body.endTime);
    
    let parsedDates;
    try {
      parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
      console.log('[USER_PATH_BOOKING] Parsed dates:', {
        startTime: parsedDates.startTime.toISOString(),
        endTime: parsedDates.endTime.toISOString()
      });
    } catch (dateError) {
      console.error('[USER_PATH_BOOKING] Date parsing error:', dateError);
      return res.status(400).json({ 
        message: 'Invalid date format in booking request',
        error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
      });
    }
    
    // Validate the booking data with pre-parsed dates
    let bookingData;
    try {
      bookingData = insertBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        startTime: parsedDates.startTime,
        endTime: parsedDates.endTime,
        bookingLinkId: bookingLink.id
      });
      console.log('[USER_PATH_BOOKING] Successfully validated booking data');
    } catch (validationError) {
      console.error('[USER_PATH_BOOKING] Validation error:', validationError);
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
    
    // Check if booking duration matches the link's configured duration
    // Allow a small margin of error (1 minute) for any minor timezone calculation differences
    if (Math.abs(durationMinutes - bookingLink.duration) > 1) {
      console.log(`[USER_PATH_BOOKING] Duration mismatch: expected ${bookingLink.duration}, got ${durationMinutes}`);
      return res.status(400).json({ 
        message: 'Invalid booking duration', 
        expected: bookingLink.duration,
        received: durationMinutes 
      });
    }
    
    // Check the events happening on the calendar
    // For team booking, we need to check all team members' calendars
    if (bookingLink.teamId) {
      const team = await storage.getTeam(bookingLink.teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      const members = await storage.getUsersByTeam(team.id);
      
      // If no assignedUserId specified, we'll automatically assign a team member
      if (!bookingData.assignedUserId) {
        // Get available slots for all members and select the most available member
        // Create a copy of the time
        const dateToCheck = new Date(startTime.getTime());
        
        // Check for a team member who's free at this time
        for (const member of members) {
          const availability = await isUserAvailable(
            member.id,
            startTime,
            endTime
          );
          
          if (availability.available) {
            bookingData.assignedUserId = member.id;
            break;
          }
        }
        
        // If no team member is available, return an error
        if (!bookingData.assignedUserId) {
          return res.status(409).json({ 
            message: 'No team members are available at this time',
            conflict: true,
            suggestions: [] // We'll add in suggested times in the future
          });
        }
      }
      
      // If assignedUserId is specified, check if they are available
      else {
        // Check if they're part of the team
        const isMember = members.some((member: User) => member.id === bookingData.assignedUserId);
        
        if (!isMember) {
          return res.status(400).json({ 
            message: 'Assigned user is not a member of this team'
          });
        }
        
        // Check if they're available
        const availability = await isUserAvailable(
          bookingData.assignedUserId,
          startTime,
          endTime
        );
        
        if (!availability.available) {
          return res.status(409).json({ 
            message: 'The selected team member is not available at this time',
            conflict: true,
            suggestions: [] // We'll add in suggested times in the future
          });
        }
      }
    }
    else {
      // For individual booking links, check the owner's calendar
      const availability = await isUserAvailable(
        owner.id,
        startTime,
        endTime
      );
      
      if (!availability.available) {
        console.log(`[USER_PATH_BOOKING] Time slot unavailable for user ${owner.id}`);
        return res.status(409).json({ 
          message: 'This time slot is already booked',
          conflict: true,
          suggestions: [] // We'll add in suggested times in the future
        });
      }
    }
    
    // Create the booking
    const booking = await storage.createBooking(bookingData);
    
    if (!booking) {
      return res.status(500).json({ message: 'Error creating booking' });
    }
    
    // Determine the user who will receive the calendar event
    const targetUserId = bookingData.assignedUserId || owner.id;
    
    // Get the calendar integration for the user
    const integrations = await storage.getCalendarIntegrations(targetUserId);
    let calendarEvent = null;
    
    // Create the event on the calendar
    for (const integration of integrations) {
      let calendarService: any = null;
      
      if (integration.type === 'google') {
        calendarService = new GoogleCalendarService(integration.userId);
      }
      else if (integration.type === 'outlook') {
        calendarService = new OutlookCalendarService(integration.userId);
      }
      
      if (calendarService) {
        try {
          const event = await calendarService.createEvent({
            summary: `Meeting with ${bookingData.name}`,
            description: bookingData.notes || 'Booking created via MySmartScheduler',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            attendees: [
              { email: bookingData.email, name: bookingData.name },
              { email: owner.email, name: `${owner.firstName} ${owner.lastName}` }
            ]
          });
          
          if (event) {
            // Store the event in our database
            calendarEvent = await storage.createEvent({
              userId: targetUserId,
              title: `Meeting with ${bookingData.name}`,
              description: bookingData.notes || 'Booking created via MySmartScheduler',
              startTime: startTime,
              endTime: endTime,
              externalId: event.id,
              calendarType: integration.type
            });
            
            // Update the booking with the event ID
            await storage.updateBooking(booking.id, { 
              eventId: calendarEvent.id 
            });
            
            break; // Stop after first successful calendar integration
          }
        } catch (error) {
          console.error('[USER_PATH_BOOKING] Error creating calendar event:', error);
          // Continue to the next integration if one fails
        }
      }
    }
    
    // Get the assignee's information if applicable
    let assignee: User = owner;
    if (bookingData.assignedUserId) {
      const assigneeUser = await storage.getUser(bookingData.assignedUserId);
      if (assigneeUser) {
        assignee = assigneeUser;
      }
    }

    // Send confirmation email to the person who booked
    try {
      
      // Send confirmation to the person booking
      await sendNotificationEmail(
        bookingData.email, 
        'Booking Confirmation', 
        `Your booking with ${assignee.firstName} ${assignee.lastName} has been confirmed for ${formatDate(startTime)} at ${formatDate(endTime, 'time')}.`,
        getBookingConfirmationHtml(bookingData, assignee, startTime, endTime, bookingLink.title)
      );
      
      // Send notification to the person being booked
      await sendNotificationEmail(
        assignee.email, 
        'New Booking', 
        `${bookingData.name} has booked a meeting with you for ${formatDate(startTime)} at ${formatDate(endTime, 'time')}.`,
        getNewBookingHtml(bookingData, startTime, endTime)
      );
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // Don't fail the booking if email fails
    }
    
    // Set up reminders for both parties
    try {
      if (calendarEvent) {
        await reminderService.scheduleReminders(calendarEvent.id);
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      // Don't fail the booking if reminders fail
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('[USER_PATH_BOOKING] Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking', error: (error as Error).message });
  }
});
}