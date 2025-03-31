import { Event } from '@shared/schema';

export interface TimeZone {
  id: string;
  name: string;
  offset: string;
  abbr: string;
}

// Popular time zones for the dropdown
export const popularTimeZones: TimeZone[] = [
  { id: 'America/New_York', name: 'New York (GMT-4)', offset: '-04:00', abbr: 'EDT' },
  { id: 'America/Los_Angeles', name: 'Los Angeles (GMT-7)', offset: '-07:00', abbr: 'PDT' },
  { id: 'America/Chicago', name: 'Chicago (GMT-5)', offset: '-05:00', abbr: 'CDT' },
  { id: 'Europe/London', name: 'London (GMT+1)', offset: '+01:00', abbr: 'BST' },
  { id: 'Europe/Paris', name: 'Paris (GMT+2)', offset: '+02:00', abbr: 'CEST' },
  { id: 'Asia/Tokyo', name: 'Tokyo (GMT+9)', offset: '+09:00', abbr: 'JST' },
  { id: 'Asia/Singapore', name: 'Singapore (GMT+8)', offset: '+08:00', abbr: 'SGT' },
  { id: 'Australia/Sydney', name: 'Sydney (GMT+10)', offset: '+10:00', abbr: 'AEST' },
  { id: 'UTC', name: 'UTC', offset: '+00:00', abbr: 'UTC' },
];

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

  // Convert a date from one time zone to another
  convertTime(date: Date, fromTimeZone: string, toTimeZone: string): Date {
    // In a real implementation, this would use a proper time zone library
    // For this mock, we'll use a simplified approach
    
    // Get the source time zone's offset
    const fromOffset = this.getTimeZoneOffset(fromTimeZone);
    
    // Get the target time zone's offset
    const toOffset = this.getTimeZoneOffset(toTimeZone);
    
    // Calculate the offset difference in minutes
    const offsetDiff = toOffset - fromOffset;
    
    // Apply the offset difference
    const newTime = new Date(date.getTime() + offsetDiff * 60 * 1000);
    
    return newTime;
  }

  // Get the current offset in minutes for a time zone
  getTimeZoneOffset(timeZoneId: string): number {
    // In a real implementation, this would use a proper time zone library
    const timeZone = popularTimeZones.find(tz => tz.id === timeZoneId);
    
    if (!timeZone) {
      return 0; // Default to UTC
    }
    
    const offsetStr = timeZone.offset;
    const sign = offsetStr.startsWith('-') ? -1 : 1;
    const hours = parseInt(offsetStr.substring(1, 3));
    const minutes = parseInt(offsetStr.substring(4, 6));
    
    return sign * (hours * 60 + minutes);
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
