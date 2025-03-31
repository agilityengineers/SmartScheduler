// TimeZone Utilities for client-side
export interface TimeZone {
  id: string;
  name: string;
  offset: string;
  abbr: string;
}

export const popularTimeZones: TimeZone[] = [
  { id: 'America/New_York', name: 'Eastern Time (US & Canada)', offset: '-05:00', abbr: 'ET' },
  { id: 'America/Chicago', name: 'Central Time (US & Canada)', offset: '-06:00', abbr: 'CT' },
  { id: 'America/Denver', name: 'Mountain Time (US & Canada)', offset: '-07:00', abbr: 'MT' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (US & Canada)', offset: '-08:00', abbr: 'PT' },
  { id: 'America/Anchorage', name: 'Alaska', offset: '-09:00', abbr: 'AKT' },
  { id: 'Pacific/Honolulu', name: 'Hawaii', offset: '-10:00', abbr: 'HST' },
  { id: 'America/Phoenix', name: 'Arizona', offset: '-07:00', abbr: 'MST' },
  { id: 'Europe/London', name: 'London', offset: '+00:00', abbr: 'GMT' },
  { id: 'Europe/Paris', name: 'Paris', offset: '+01:00', abbr: 'CET' },
  { id: 'Europe/Berlin', name: 'Berlin', offset: '+01:00', abbr: 'CET' },
  { id: 'Europe/Athens', name: 'Athens', offset: '+02:00', abbr: 'EET' },
  { id: 'Asia/Dubai', name: 'Dubai', offset: '+04:00', abbr: 'GST' },
  { id: 'Asia/Kolkata', name: 'Mumbai', offset: '+05:30', abbr: 'IST' },
  { id: 'Asia/Shanghai', name: 'Beijing', offset: '+08:00', abbr: 'CST' },
  { id: 'Asia/Tokyo', name: 'Tokyo', offset: '+09:00', abbr: 'JST' },
  { id: 'Australia/Sydney', name: 'Sydney', offset: '+11:00', abbr: 'AEDT' },
  { id: 'Pacific/Auckland', name: 'Auckland', offset: '+13:00', abbr: 'NZDT' },
  { id: 'UTC', name: 'UTC', offset: '+00:00', abbr: 'UTC' },
];

// Get user's timezone
export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// Format date and time for display
export function formatDateTime(date: Date, timeZone: string, format: '12h' | '24h' = '12h', includeDate = true): string {
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
}

// Format date time range for display
export function formatDateTimeRange(startTime: Date, endTime: Date, timeZone: string): string {
  const sameDay = startTime.toDateString() === endTime.toDateString();
  
  if (sameDay) {
    const startFormatted = formatDateTime(startTime, timeZone, '12h', true);
    const endFormatted = formatDateTime(endTime, timeZone, '12h', false);
    return `${startFormatted} - ${endFormatted}`;
  } else {
    const startFormatted = formatDateTime(startTime, timeZone, '12h', true);
    const endFormatted = formatDateTime(endTime, timeZone, '12h', true);
    return `${startFormatted} - ${endFormatted}`;
  }
}