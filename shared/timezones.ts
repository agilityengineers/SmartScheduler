// Shared timezone definitions for both client and server
export interface TimeZone {
  id: string;
  name: string;
  abbr: string;
  standardOffset: string; // Default standard time offset
}

// Common timezone definitions without hardcoded offsets
export const timeZoneDefinitions: TimeZone[] = [
  { id: 'America/New_York', name: 'Eastern Time (US & Canada)', standardOffset: '-05:00', abbr: 'ET' },
  { id: 'America/Chicago', name: 'Central Time (US & Canada)', standardOffset: '-06:00', abbr: 'CT' },
  { id: 'America/Denver', name: 'Mountain Time (US & Canada)', standardOffset: '-07:00', abbr: 'MT' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (US & Canada)', standardOffset: '-08:00', abbr: 'PT' },
  { id: 'America/Anchorage', name: 'Alaska', standardOffset: '-09:00', abbr: 'AKT' },
  { id: 'Pacific/Honolulu', name: 'Hawaii', standardOffset: '-10:00', abbr: 'HST' },
  { id: 'America/Phoenix', name: 'Arizona', standardOffset: '-07:00', abbr: 'MST' },
  { id: 'Europe/London', name: 'London', standardOffset: '+00:00', abbr: 'GMT' },
  { id: 'Europe/Paris', name: 'Paris', standardOffset: '+01:00', abbr: 'CET' },
  { id: 'Europe/Berlin', name: 'Berlin', standardOffset: '+01:00', abbr: 'CET' },
  { id: 'Europe/Athens', name: 'Athens', standardOffset: '+02:00', abbr: 'EET' },
  { id: 'Asia/Dubai', name: 'Dubai', standardOffset: '+04:00', abbr: 'GST' },
  { id: 'Asia/Kolkata', name: 'Mumbai', standardOffset: '+05:30', abbr: 'IST' },
  { id: 'Asia/Shanghai', name: 'Beijing', standardOffset: '+08:00', abbr: 'CST' },
  { id: 'Asia/Tokyo', name: 'Tokyo', standardOffset: '+09:00', abbr: 'JST' },
  { id: 'Australia/Sydney', name: 'Sydney', standardOffset: '+10:00', abbr: 'AEST' },
  { id: 'Pacific/Auckland', name: 'Auckland', standardOffset: '+12:00', abbr: 'NZST' },
  { id: 'UTC', name: 'UTC', standardOffset: '+00:00', abbr: 'UTC' },
];

/**
 * Get the current timezone offset for a given timezone
 * @param tzId Timezone identifier (e.g., 'America/New_York')
 * @param date Optional date to check offset for (defaults to current date)
 * @returns Formatted offset string in the format '+/-HH:MM'
 */
export function getCurrentTimezoneOffset(tzId: string, date: Date = new Date()): string {
  try {
    // Get the offset in minutes
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzId,
      timeZoneName: 'short'
    });
    
    // Format the date in the specified timezone to get the abbreviation that includes DST info
    const tzInfo = formatter.formatToParts(date).find(part => part.type === 'timeZoneName');
    const tzName = tzInfo?.value || '';
    
    // Calculate the offset in minutes
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tzId }));
    const offsetInMinutes = (utcDate.getTime() - tzDate.getTime()) / (60 * 1000);
    
    // Format the offset string
    const sign = offsetInMinutes <= 0 ? '+' : '-'; // Note: The sign is inverted because of how JS calculates TZ offset
    const absMinutes = Math.abs(offsetInMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`Error getting offset for ${tzId}:`, error);
    
    // Return the standard offset as fallback
    const timezone = timeZoneDefinitions.find(tz => tz.id === tzId);
    return timezone?.standardOffset || '+00:00';
  }
}

/**
 * Format a timezone name with the current GMT offset
 * @param tzId Timezone identifier
 * @param date Optional date to check offset for
 * @returns Formatted timezone name with current offset
 */
export function formatTimezoneName(tzId: string, date: Date = new Date()): string {
  const timezone = timeZoneDefinitions.find(tz => tz.id === tzId);
  if (!timezone) return tzId;
  
  const offset = getCurrentTimezoneOffset(tzId, date);
  
  // Replace GMT+/-XX part of name or append if not present
  if (timezone.name.includes('GMT')) {
    // Extract the base name without the GMT part
    const baseName = timezone.name.replace(/\(GMT[+-]\d{1,2}(?::\d{2})?\)/i, '').trim();
    return `${baseName} (GMT${offset})`;
  } else {
    return `${timezone.name} (GMT${offset})`;
  }
}

/**
 * Get a full timezone object with current offset and formatted name
 * @param tzId Timezone identifier
 * @param date Optional date to check
 * @returns Complete timezone object with current offset
 */
export function getTimezoneWithCurrentOffset(tzId: string, date: Date = new Date()): TimeZone & { offset: string, formattedName: string } {
  const timezone = timeZoneDefinitions.find(tz => tz.id === tzId) || {
    id: tzId,
    name: tzId,
    standardOffset: '+00:00',
    abbr: 'UTC'
  };
  
  const currentOffset = getCurrentTimezoneOffset(tzId, date);
  const formattedName = formatTimezoneName(tzId, date);
  
  return {
    ...timezone,
    offset: currentOffset,
    formattedName
  };
}

/**
 * Get a list of all timezones with their current offsets
 * @param date Optional date to check offsets for
 * @returns Array of timezone objects with current offsets
 */
export function getAllTimezonesWithCurrentOffsets(date: Date = new Date()): Array<TimeZone & { offset: string, formattedName: string }> {
  return timeZoneDefinitions.map(tz => getTimezoneWithCurrentOffset(tz.id, date));
}