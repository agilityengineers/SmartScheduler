import { Event, BookingLink, User } from '@shared/schema';
import { storage } from '../storage';
import { addMinutes, parseISO, format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { getCurrentTimezoneOffset } from '../../shared/timezones';

// Function to get timezone offset in minutes with proper DST handling
function getTimezoneOffset(timeZone: string, date: Date = new Date()): number {
  try {
    // Use the shared timezone utility to calculate the current offset (with DST awareness)
    const offsetStr = getCurrentTimezoneOffset(timeZone, date);
    
    // Parse the offset string (e.g., "+01:00", "-04:00")
    const sign = offsetStr.startsWith('-') ? -1 : 1;
    const hours = parseInt(offsetStr.substring(1, 3));
    const minutes = parseInt(offsetStr.substring(4, 6));
    
    // Return the offset in minutes
    return sign * (hours * 60 + minutes);
  } catch (error) {
    console.error(`Error getting timezone offset for ${timeZone}:`, error);
    
    // Fallback to legacy method if the shared utility fails
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return (utcDate.getTime() - tzDate.getTime()) / (60 * 1000);
  }
}

/**
 * Service for team scheduling related functionality
 */
export class TeamSchedulingService {
  /**
   * Find common availability slots for team members
   * @param teamMembers Array of user IDs in the team
   * @param startDate Start date for checking availability
   * @param endDate End date for checking availability
   * @param duration Duration of meeting in minutes
   * @param bufferBefore Buffer time before meeting in minutes
   * @param bufferAfter Buffer time after meeting in minutes
   * @param timezone Optional timezone for generating slots
   * @returns Array of available time slots
   */
  async findCommonAvailability(
    teamMembers: number[],
    startDate: Date,
    endDate: Date,
    duration: number,
    bufferBefore: number = 0,
    bufferAfter: number = 0,
    timezone: string = 'UTC'
  ): Promise<{ start: Date; end: Date }[]> {
    console.log(`[DEBUG] Finding availability with timezone: ${timezone}`);
    console.log(`[DEBUG] startDate: ${startDate}, endDate: ${endDate}`);
    console.log(`[DEBUG] duration: ${duration} mins, buffers: ${bufferBefore}/${bufferAfter} mins`);
    // Get all events for team members in the date range
    const allEvents: Event[] = [];
    for (const userId of teamMembers) {
      const events = await storage.getEvents(userId, startDate, endDate);
      allEvents.push(...events);
    }

    // Get users for working hours
    const users: User[] = [];
    for (const userId of teamMembers) {
      const user = await storage.getUser(userId);
      if (user) {
        users.push(user);
      }
    }

    // Find all settings for users to get working hours and time blocks
    const settings = [];
    const allTimeBlocks: any[] = [];
    
    for (const userId of teamMembers) {
      const userSettings = await storage.getSettings(userId);
      if (userSettings) {
        settings.push(userSettings);
        
        // Get time blocks from settings
        if (userSettings.timeBlocks && Array.isArray(userSettings.timeBlocks)) {
          allTimeBlocks.push(...userSettings.timeBlocks);
        }
      }
    }

    // Get working hours intersection
    // Business hours should be 9 AM - 5 PM in the user's selected timezone
    // The time slots will be generated in this range and then converted to UTC for storage
    const workingHours = {
      0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
      1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
      2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
      3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
      4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
      5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
      6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
    };

    // Create time slots at 30-minute intervals within working hours
    const availableSlots = this.generateTimeSlots(startDate, endDate, workingHours, duration, bufferBefore, bufferAfter, timezone);
    
    // Convert time blocks to event-like objects for filtering
    const timeBlockEvents: Event[] = this.convertTimeBlocksToEvents(allTimeBlocks);
    
    // Add time block events to all events for filtering
    allEvents.push(...timeBlockEvents);
    
    // Filter out slots that conflict with existing events and time blocks
    const filteredSlots = this.filterConflictingSlots(availableSlots, allEvents, duration, bufferBefore, bufferAfter);
    
    // Log some slots for debugging
    console.log(`[DEBUG] Generated ${filteredSlots.length} available slots for timezone ${timezone}`);
    if (filteredSlots.length > 0) {
      console.log(`[DEBUG] First 3 slots: `);
      filteredSlots.slice(0, 3).forEach((slot, i) => {
        console.log(`[DEBUG] Slot ${i+1}: ${slot.start.toISOString()} - ${slot.end.toISOString()}`);
      });
    }
    
    return filteredSlots;
  }

  /**
   * Generate time slots within working hours
   * @param startDate Start date for checking availability
   * @param endDate End date for checking availability
   * @param workingHours Working hours configuration
   * @param duration Duration of meeting in minutes
   * @param bufferBefore Buffer time before meeting in minutes
   * @param bufferAfter Buffer time after meeting in minutes
   * @param timezone Timezone to generate slots in
   * @returns Array of available time slots
   */
  private generateTimeSlots(
    startDate: Date,
    endDate: Date,
    workingHours: any,
    duration: number,
    bufferBefore: number,
    bufferAfter: number,
    timezone: string = 'UTC'
  ): { start: Date; end: Date }[] {
    console.log(`[DEBUG] Generating time slots for timezone: ${timezone}`);
    console.log(`[DEBUG] Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    
    const slots: { start: Date; end: Date }[] = [];
    const totalDuration = duration + bufferBefore + bufferAfter;
    
    // Get the current date in the requested timezone
    const tzStartDate = toZonedTime(startDate, timezone);
    const tzEndDate = toZonedTime(endDate, timezone);
    
    // Clone and set to start of day
    const currentDate = new Date(tzStartDate);
    currentDate.setHours(0, 0, 0, 0);
    
    // Loop through each day in the range
    while (currentDate <= tzEndDate) {
      console.log(`[DEBUG] Processing day: ${currentDate.toISOString()} (${currentDate.getDay()})`);
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = currentDate.getDay().toString();
      const dayHours = workingHours[dayOfWeek];
      
      // Skip if this day is disabled
      if (!dayHours.enabled) {
        console.log(`[DEBUG] Day ${dayOfWeek} is disabled, skipping.`);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      }
      
      // Parse the working hours for this day (e.g., "09:00" -> 9, 0)
      const [startHour, startMinute] = dayHours.start.split(':').map(Number);
      const [endHour, endMinute] = dayHours.end.split(':').map(Number);
      
      console.log(`[DEBUG] Working hours: ${startHour}:${startMinute} - ${endHour}:${endMinute} (${timezone})`);
      
      // Create a date representing the start of working hours on this day
      const workDayStart = new Date(currentDate);
      workDayStart.setHours(startHour, startMinute, 0, 0);
      
      // Create a date representing the end of working hours on this day
      const workDayEnd = new Date(currentDate);
      workDayEnd.setHours(endHour, endMinute, 0, 0);
      
      console.log(`[DEBUG] Work day: ${workDayStart.toISOString()} - ${workDayEnd.toISOString()}`);
      
      // Create slot times at 30-minute intervals
      const slotTime = new Date(workDayStart);
      
      while (addMinutes(slotTime, totalDuration) <= workDayEnd) {
        // Create a local time slot in the target timezone
        const slotStartLocal = new Date(slotTime);
        const slotEndLocal = addMinutes(slotTime, duration);
        
        // Create a formatted time string for debugging in the target timezone
        const localTimeString = format(slotStartLocal, "h:mm a");
        console.log(`[DEBUG] Processing local slot: ${localTimeString} ${timezone}`);
        
        try {
          // Convert the local timezone slot to UTC by calculating the timezone offset
          // This ensures the time is properly converted considering DST
          const tzOffset = getTimezoneOffset(timezone, slotStartLocal);
          
          // Convert from local timezone to UTC
          const startUtc = new Date(slotStartLocal.getTime() - (tzOffset * 60 * 1000));
          const endUtc = new Date(slotEndLocal.getTime() - (tzOffset * 60 * 1000));
          
          console.log(`[DEBUG] Local slot in ${timezone}: ${slotStartLocal.toISOString()} - ${slotEndLocal.toISOString()}`);
          console.log(`[DEBUG] Converted to UTC (offset ${tzOffset}min): ${startUtc.toISOString()} - ${endUtc.toISOString()}`);
          
          // Store these slots
          slots.push({
            start: startUtc,
            end: endUtc
          });
        } catch (error) {
          console.error(`[ERROR] Failed to convert timezone for slot ${localTimeString} ${timezone}:`, error);
          
          // Fallback - use formatting to do the conversion
          try {
            // Fallback to using string formatting with formatInTimeZone
            const startUtcStr = formatInTimeZone(slotStartLocal, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            const endUtcStr = formatInTimeZone(slotEndLocal, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            
            // Parse these ISO strings back to Date objects
            const startUtc = new Date(startUtcStr);
            const endUtc = new Date(endUtcStr);
            
            console.log(`[DEBUG] Fallback UTC: ${startUtc.toISOString()} - ${endUtc.toISOString()}`);
            
            slots.push({
              start: startUtc,
              end: endUtc
            });
          } catch (fallbackError) {
            console.error(`[ERROR] Fallback timezone conversion also failed:`, fallbackError);
            // Skip this slot if both methods fail
          }
        }
        
        // Move to the next slot (30 minutes later)
        slotTime.setMinutes(slotTime.getMinutes() + 30);
      }
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
    
    return slots;
  }

  /**
   * Filter out time slots that conflict with existing events
   */
  private filterConflictingSlots(
    slots: { start: Date; end: Date }[],
    events: Event[],
    duration: number,
    bufferBefore: number,
    bufferAfter: number
  ): { start: Date; end: Date }[] {
    return slots.filter(slot => {
      // Add buffers to slot start and end
      const slotStartWithBuffer = addMinutes(slot.start, -bufferBefore);
      const slotEndWithBuffer = addMinutes(slot.end, bufferAfter);
      
      // Check for conflicts with any event
      return !events.some(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        
        // Check if event overlaps with slot (including buffers)
        return (
          (slotStartWithBuffer <= eventEnd && slotEndWithBuffer >= eventStart)
        );
      });
    });
  }

  /**
   * Convert time blocks to Event objects for filtering
   * @param timeBlocks Array of time blocks from user settings
   * @returns Array of Event objects representing unavailable time blocks
   */
  private convertTimeBlocksToEvents(timeBlocks: any[]): Event[] {
    const timeBlockEvents: Event[] = [];
    
    timeBlocks.forEach(block => {
      if (block && block.startDate && block.endDate) {
        // Convert dates from string to Date if needed
        const startDate = typeof block.startDate === 'string' 
          ? new Date(block.startDate) 
          : block.startDate;
          
        const endDate = typeof block.endDate === 'string'
          ? new Date(block.endDate)
          : block.endDate;
        
        // Basic validation to ensure dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return;
        }
        
        // Create an event from this time block
        const timeBlockEvent: Event = {
          id: 0, // Temporary ID
          userId: 0, // Not relevant for filtering
          title: block.title || 'Unavailable',
          description: block.notes || 'Time block',
          startTime: startDate,
          endTime: endDate,
          location: '',
          meetingUrl: '',
          isAllDay: block.allDay || false,
          externalId: null,
          calendarType: null,
          calendarIntegrationId: null,
          attendees: [],
          reminders: [],
          timezone: null,
          recurrence: block.recurrence || null
          // We're ignoring recurrence for now - would need more complex logic to handle recurring blocks
        };
        
        timeBlockEvents.push(timeBlockEvent);
      }
    });
    
    return timeBlockEvents;
  }

  /**
   * Assign a booking to a team member based on assignment method
   * @param bookingLink The team booking link
   * @param startTime The booking start time
   * @param endTime The booking end time
   * @returns The selected team member ID
   */
  async assignTeamMember(
    bookingLink: BookingLink,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const teamMemberIds = bookingLink.teamMemberIds as number[] || [];
    
    if (teamMemberIds.length === 0) {
      throw new Error('No team members available for assignment');
    }
    
    switch (bookingLink.assignmentMethod) {
      case 'pooled':
        // Pooled method - find first available team member
        for (const userId of teamMemberIds) {
          const events = await storage.getEvents(userId, startTime, endTime);
          const hasConflict = events.some(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            return (startTime < eventEnd && endTime > eventStart);
          });
          
          if (!hasConflict) {
            return userId;
          }
        }
        throw new Error('No team members available at the requested time');
        
      case 'round-robin':
        // Round-robin method - get team member with least bookings
        const bookings = await storage.getBookingLinks(bookingLink.userId);
        const bookingCounts = new Map<number, number>();
        
        // Initialize counts for all team members
        teamMemberIds.forEach(id => bookingCounts.set(id, 0));
        
        // Count existing bookings for each team member
        for (const link of bookings) {
          if (link.isTeamBooking) {
            const memberBookings = await storage.getBookings(link.id);
            memberBookings.forEach(booking => {
              if (booking.assignedUserId && bookingCounts.has(booking.assignedUserId)) {
                bookingCounts.set(
                  booking.assignedUserId, 
                  (bookingCounts.get(booking.assignedUserId) || 0) + 1
                );
              }
            });
          }
        }
        
        // Find team member with least bookings
        let minBookings = Number.MAX_SAFE_INTEGER;
        let selectedMemberId = teamMemberIds[0];
        
        bookingCounts.forEach((count, userId) => {
          if (count < minBookings) {
            minBookings = count;
            selectedMemberId = userId;
          }
        });
        
        return selectedMemberId;
        
      case 'specific':
      default:
        // Default to the first team member (or could be a specific one set elsewhere)
        return teamMemberIds[0];
    }
  }
}

export const teamSchedulingService = new TeamSchedulingService();