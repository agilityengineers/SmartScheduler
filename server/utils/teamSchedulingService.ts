import { Event, BookingLink, User } from '@shared/schema';
import { storage } from '../storage';
import { addMinutes, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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
    // For simplicity, use 9-5 if no working hours found
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
    return this.filterConflictingSlots(availableSlots, allEvents, duration, bufferBefore, bufferAfter);
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
    const slots: { start: Date; end: Date }[] = [];
    const totalDuration = duration + bufferBefore + bufferAfter;
    
    // Convert dates to the specified timezone for proper working hours calculation
    const currentDate = toZonedTime(new Date(startDate), timezone);
    const endDateInTimezone = toZonedTime(new Date(endDate), timezone);
    
    // Reset time to start of day
    currentDate.setHours(0, 0, 0, 0);
    
    // Loop through each day
    while (currentDate < endDateInTimezone) {
      const dayOfWeek = currentDate.getDay().toString();
      const dayHours = workingHours[dayOfWeek];
      
      if (dayHours.enabled) {
        // Parse working hours - these should be in business hours (9-5) regardless of timezone
        const [startHour, startMinute] = dayHours.start.split(':').map((n: string) => parseInt(n));
        const [endHour, endMinute] = dayHours.end.split(':').map((n: string) => parseInt(n));
        
        // Set current time to start of working hours in the target timezone
        currentDate.setHours(startHour, startMinute, 0, 0);
        
        // Create slots at 30-minute intervals
        const endOfWorkingHours = new Date(currentDate);
        endOfWorkingHours.setHours(endHour, endMinute, 0, 0);
        
        // Create a working copy that we'll increment
        const slotTime = new Date(currentDate);
        
        while (addMinutes(slotTime, totalDuration) <= endOfWorkingHours) {
          // For the time slots, we need to properly represent business hours (9-5) in the requested timezone
          // We formatted the time in the local timezone already (in business hours), now convert to UTC for storage
          const localSlotStart = formatInTimeZone(slotTime, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          const localSlotEnd = formatInTimeZone(addMinutes(slotTime, duration), timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          
          // Parse the formatted strings into Date objects (in UTC)
          const slotStartUtc = new Date(localSlotStart);
          const slotEndUtc = new Date(localSlotEnd);
          
          slots.push({
            start: slotStartUtc,
            end: slotEndUtc
          });
          
          // Move to next slot (30-minute intervals)
          slotTime.setMinutes(slotTime.getMinutes() + 30);
        }
      }
      
      // Move to next day
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