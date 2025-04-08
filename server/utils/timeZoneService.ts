import { Event } from '../../shared/schema';
import { 
  TimeZone, 
  timeZoneDefinitions, 
  getCurrentTimezoneOffset, 
  getTimezoneWithCurrentOffset, 
  getAllTimezonesWithCurrentOffsets 
} from '../../shared/timezones';

// Export the timezone definitions with current offsets
export const popularTimeZones = getAllTimezonesWithCurrentOffsets();

export class TimeZoneService {
  // Convert an event's time from one time zone to another
  convertEventTimeZone(event: Event, targetTimeZone: string): Event {
    if (!event.timezone || event.timezone === targetTimeZone) {
      return event;
    }

    // Deep clone the event to avoid mutating the original
    const convertedEvent = JSON.parse(JSON.stringify(event)) as Event;
    
    try {
      // Convert start time
      const startTime = new Date(event.startTime);
      convertedEvent.startTime = this.convertTime(startTime, event.timezone, targetTimeZone);
      
      // Convert end time
      const endTime = new Date(event.endTime);
      convertedEvent.endTime = this.convertTime(endTime, event.timezone, targetTimeZone);
      
      // Update the time zone
      convertedEvent.timezone = targetTimeZone;
      
      return convertedEvent;
    } catch (error) {
      console.error('Error converting time zones:', error);
      return event;
    }
  }

  // Convert a date from one time zone to another using more accurate conversion
  convertTime(date: Date, fromTimeZone: string, toTimeZone: string): Date {
    if (!date) return new Date();
    
    try {
      // Step 1: Get the ISO string representation in the source timezone
      const sourceTzDate = new Date(date.toLocaleString('en-US', { timeZone: fromTimeZone }));
      const sourceIsoLocal = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
      ).toISOString();
      
      // Step 2: Create a new date object with the adjusted time
      const targetTzDate = new Date(new Date(sourceIsoLocal).toLocaleString('en-US', { timeZone: toTimeZone }));
      
      // Step 3: Calculate the time difference between the two timezone representations
      const tzDiff = sourceTzDate.getTime() - targetTzDate.getTime();
      
      // Step 4: Apply the difference to the original date
      return new Date(date.getTime() - tzDiff);
    } catch (error) {
      console.error('Error converting between timezones:', error);
      return date; // Return original date on error
    }
  }

  // Get the current offset in minutes for a time zone using shared utility
  getTimeZoneOffset(timeZoneId: string, date: Date = new Date()): number {
    try {
      // Use our shared utility function to get the current offset
      const offsetStr = getCurrentTimezoneOffset(timeZoneId, date);
      
      if (!offsetStr) return 0;
      
      const sign = offsetStr.startsWith('-') ? -1 : 1;
      const hours = parseInt(offsetStr.substring(1, 3));
      const minutes = parseInt(offsetStr.substring(4, 6));
      
      return sign * (hours * 60 + minutes);
    } catch (error) {
      console.error(`Error getting timezone offset for ${timeZoneId}:`, error);
      return 0; // Default to UTC on error
    }
  }

  // Get the current user's time zone
  getUserTimeZone(): string {
    try {
      // In a real implementation, this would detect the browser's time zone
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (error) {
      return 'UTC';
    }
  }

  // Format a date according to the user's locale and time zone
  formatDateTime(date: Date, timeZone: string, format: '12h' | '24h' = '12h', includeDate = true): string {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
      };
      
      if (format === '24h') {
        options.hour12 = false;
      } else {
        options.hour12 = true;
      }
      
      if (includeDate) {
        options.weekday = 'short';
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      // Fallback to a basic format
      return date.toLocaleString();
    }
  }
}

export const timeZoneService = new TimeZoneService();
