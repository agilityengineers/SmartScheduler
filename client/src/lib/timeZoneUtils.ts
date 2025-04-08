// TimeZone Utilities for client-side
import { type TimeZone as SharedTimeZone, timeZoneDefinitions } from '../../shared/timezones';

// Define our own TimeZone interface for backward compatibility
export interface TimeZone {
  id: string;
  name: string;
  offset: string;
  abbr: string;
}

// Use the shared timezone definitions, mapped to our interface
export const popularTimeZones: TimeZone[] = timeZoneDefinitions.map((tz: SharedTimeZone) => ({
  id: tz.id,
  name: tz.name,
  offset: tz.standardOffset, // Provide offset for backward compatibility
  abbr: tz.abbr
}));

// Get user's timezone with more accurate detection
export function getUserTimeZone(): string {
  try {
    // Try to get the timezone from the browser
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Validate that it's a real timezone ID
    if (timezone && timezone !== 'UTC' && timezone.includes('/')) {
      return timezone;
    }
    
    // Fallback: try to detect from offset
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    
    // Find a timezone that matches this offset roughly
    const matchingTz = popularTimeZones.find(tz => {
      const tzOffset = parseInt(tz.offset.substring(0, 3));
      return offsetStr === `${tzOffset >= 0 ? '+' : ''}${tzOffset}`;
    });
    
    return matchingTz?.id || 'UTC';
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'UTC';
  }
}

// Format date and time for display with DST awareness
export function formatDateTime(date: Date, timeZone: string, format: '12h' | '24h' = '12h', includeDate = true): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('Invalid date provided to formatDateTime:', date);
    return 'Invalid date';
  }
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
    };

    if (includeDate) {
      options.weekday = 'short';
      options.month = 'short';
      options.day = 'numeric';
      options.year = 'numeric';
    }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error(`Error formatting date ${date} in timezone ${timeZone}:`, error);
    // Fallback to basic formatting
    return includeDate 
      ? date.toLocaleString() 
      : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: format === '12h' });
  }
}

// Format date time range for display with better timezone handling
export function formatDateTimeRange(startTime: Date, endTime: Date, timeZone: string): string {
  if (!startTime || !endTime || !(startTime instanceof Date) || !(endTime instanceof Date)) {
    console.error('Invalid date range provided to formatDateTimeRange:', { startTime, endTime });
    return 'Invalid date range';
  }
  
  try {
    // Check if the dates are on the same day in the specified timezone
    const startOptions: Intl.DateTimeFormatOptions = { 
      timeZone, 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    };
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', startOptions);
    const sameDay = dateFormatter.format(startTime) === dateFormatter.format(endTime);
    
    if (sameDay) {
      // Same day: show date once with time range
      const startFormatted = formatDateTime(startTime, timeZone, '12h', true);
      const endFormatted = formatDateTime(endTime, timeZone, '12h', false);
      return `${startFormatted} - ${endFormatted}`;
    } else {
      // Different days: show full date and time for both
      const startFormatted = formatDateTime(startTime, timeZone, '12h', true);
      const endFormatted = formatDateTime(endTime, timeZone, '12h', true);
      return `${startFormatted} - ${endFormatted}`;
    }
  } catch (error) {
    console.error('Error formatting date range:', error);
    // Fallback to basic formatting
    return `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`;
  }
}