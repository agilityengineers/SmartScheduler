import { useState, useEffect } from 'react';
import { format, formatISO, addMinutes, differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface TimeZone {
  id: string;
  name: string;
  offset: string;
  value?: string; // For backward compatibility
  label?: string; // For backward compatibility
}

/**
 * Format a date and time based on the provided timezone
 * @param date The date to format
 * @param timeZone The timezone to use for formatting
 * @param formatString The format string (default: 'PPpp')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, timeZone: string = 'UTC', formatString: string = 'PPpp'): string {
  if (!date) return '';
  
  try {
    // Convert to Date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Convert the UTC date to the target timezone
    const zonedDate = toZonedTime(dateObj, timeZone);
    
    // Format the date
    return format(zonedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return typeof date === 'string' ? date : date.toString();
  }
}

/**
 * Format a date/time range with the same timezone
 * @param startDate Start date/time
 * @param endDate End date/time
 * @param timeZone Timezone to use
 * @param formatOptions Options for formatting
 * @returns Formatted date/time range string
 */
export function formatDateTimeRange(
  startDate: Date | string,
  endDate: Date | string,
  timeZone: string = 'UTC',
  formatOptions: {
    dateFormat?: string; 
    timeFormat?: string;
    sameDayTimeOnly?: boolean;
  } = {}
): string {
  if (!startDate || !endDate) return '';

  const startObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Convert to timezone
  const zonedStartDate = toZonedTime(startObj, timeZone);
  const zonedEndDate = toZonedTime(endObj, timeZone);
  
  // Format options
  const dateFormat = formatOptions.dateFormat || 'MMM d, yyyy';
  const timeFormat = formatOptions.timeFormat || 'h:mm a';
  
  // Check if same day
  const startDay = format(zonedStartDate, 'yyyy-MM-dd');
  const endDay = format(zonedEndDate, 'yyyy-MM-dd');
  const isSameDay = startDay === endDay;
  
  if (isSameDay && formatOptions.sameDayTimeOnly) {
    // Format as: "March 15, 2023, 2:30 PM - 3:30 PM"
    return `${format(zonedStartDate, dateFormat)}, ${format(zonedStartDate, timeFormat)} - ${format(zonedEndDate, timeFormat)}`;
  } else {
    // Format as: "March 15, 2023, 2:30 PM - March 16, 2023, 3:30 PM"
    return `${format(zonedStartDate, dateFormat)}, ${format(zonedStartDate, timeFormat)} - ${format(zonedEndDate, dateFormat)}, ${format(zonedEndDate, timeFormat)}`;
  }
}

/**
 * Convert a date from one timezone to another
 * @param date The date to convert
 * @param fromTimeZone Source timezone
 * @param toTimeZone Target timezone
 * @returns Date object in the target timezone
 */
export function convertTimeZone(date: Date | string, fromTimeZone: string, toTimeZone: string): Date {
  if (!date) return new Date();
  
  try {
    // Convert to Date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // We can convert directly to the target timezone
    // date-fns-tz doesn't have a direct way to convert between timezones
    // so we use the format string representation of the date in the source timezone
    // and then parse it in the target timezone
    return toZonedTime(dateObj, toTimeZone);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return typeof date === 'string' ? new Date(date) : date;
  }
}

/**
 * Hook to get the user's current timezone
 * @returns Object containing the current timezone and loading state
 */
export function useCurrentTimeZone() {
  const [timeZone, setTimeZone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [isLoading, setIsLoading] = useState(true);
  const [timeZoneOffset, setTimeZoneOffset] = useState<string>('UTC+0');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function detectTimeZone() {
      try {
        const detectResponse = await fetch('/api/timezones/detect');
        if (detectResponse.ok) {
          const { timezone, offset } = await detectResponse.json();
          setTimeZone(timezone);
          setTimeZoneOffset(offset);
        } else {
          // Fallback to browser timezone
          const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimeZone(browserTZ);
          
          // Calculate offset for display
          const now = new Date();
          const offsetMinutes = -now.getTimezoneOffset();
          const hours = Math.abs(Math.floor(offsetMinutes / 60));
          const minutes = Math.abs(offsetMinutes % 60);
          const offsetStr = `${offsetMinutes >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          setTimeZoneOffset(`UTC${offsetStr}`);
        }
      } catch (error) {
        console.error('Error detecting timezone:', error);
        setError(error as Error);
        
        // Fallback to browser timezone
        const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimeZone(browserTZ);
      } finally {
        setIsLoading(false);
      }
    }

    detectTimeZone();
  }, []);

  return { timeZone, timeZoneOffset, isLoading, error };
}

export function useTimeZones() {
  const [data, setData] = useState<TimeZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [userTimeZone, setUserTimeZone] = useState<string>('UTC');

  useEffect(() => {
    async function fetchTimeZones() {
      try {
        // Detect user's timezone
        const detectResponse = await fetch('/api/timezones/detect');
        if (detectResponse.ok) {
          const { timezone } = await detectResponse.json();
          setUserTimeZone(timezone);
        }

        // Fetch all timezones
        const timezonesResponse = await fetch('/api/timezones');
        if (timezonesResponse.ok) {
          const timezones = await timezonesResponse.json();
          setData(timezones);
        } else {
          throw new Error('Failed to fetch timezones');
        }
      } catch (error) {
        console.error('Error fetching timezones:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeZones();
  }, []);

  return { data, isLoading, isError, userTimeZone };
}