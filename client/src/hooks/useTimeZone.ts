import { useQuery } from "@tanstack/react-query";
import { TimeZone, popularTimeZones, getUserTimeZone } from "@/lib/timeZoneUtils";

export function useTimeZones() {
  // Return popular timezones directly from client-side data
  return {
    data: popularTimeZones,
    isLoading: false,
    isError: false
  };
}

export function useDetectTimeZone() {
  // Detect timezone directly on client-side
  const timezone = getUserTimeZone();
  return {
    data: { timezone },
    isLoading: false,
    isError: false
  };
}

export function useCurrentTimeZone(fallback = 'America/New_York') {
  // Get timezone directly (no need for API call)
  return getUserTimeZone() || fallback;
}

export function formatDateTime(
  date: Date | string, 
  timeZone?: string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new Intl.DateTimeFormat('en-US', mergedOptions).format(dateObj);
}

export function formatDateTimeRange(
  startDate: Date | string,
  endDate: Date | string,
  timeZone?: string
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Same day
  if (start.toDateString() === end.toDateString()) {
    return `${formatDateTime(start, timeZone, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })} • ${formatDateTime(start, timeZone, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${formatDateTime(end, timeZone, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  }
  
  // Different days
  return `${formatDateTime(start, timeZone, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric', 
    minute: '2-digit' 
  })} - ${formatDateTime(end, timeZone, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric', 
    minute: '2-digit' 
  })}`;
}
