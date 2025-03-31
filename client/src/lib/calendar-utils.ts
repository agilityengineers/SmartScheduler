import { addDays, subDays, startOfWeek, endOfWeek, format, parse, setHours, setMinutes, addMinutes } from 'date-fns';
import { Event } from '@shared/schema';

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const HOURS_IN_DAY = Array.from({ length: 24 }, (_, i) => i);

// Convert 24-hour format to 12-hour format with AM/PM
export function formatTime(hour: number, minute: number = 0): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// Format date as "Month DD, YYYY"
export function formatDate(date: Date): string {
  return format(date, 'MMMM d, yyyy');
}

// Get the current week's range (Sunday to Saturday)
export function getCurrentWeekRange(date: Date = new Date()): { start: Date, end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return { start, end };
}

// Move to the next week
export function getNextWeek(date: Date): Date {
  return addDays(date, 7);
}

// Move to the previous week
export function getPreviousWeek(date: Date): Date {
  return subDays(date, 7);
}

// Format the week range for display (e.g., "May 1 - 7, 2023")
export function formatWeekRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`;
  }
  return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`;
}

// Get CSS position for an event in the week view
export function getEventPosition(event: Event, baseTop: number = 0): {
  top: number;
  height: number;
  left: string;
  width: string;
} {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  // Calculate top position based on start time (hours and minutes)
  const hours = startTime.getHours();
  const minutes = startTime.getMinutes();
  const top = baseTop + hours * 60 + minutes;
  
  // Calculate height based on duration
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const height = durationMinutes;
  
  // Calculate left position based on day of week
  const day = startTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  return {
    top,
    height,
    left: `${(day + 1) * 12.5}%`, // +1 because first column is times
    width: 'calc(12.5% - 10px)', // 12.5% = 100% / 8 columns (7 days + time column)
  };
}

// Parse a time string (e.g., "9:00 AM") to hours and minutes
export function parseTime(timeString: string): { hours: number, minutes: number } {
  try {
    const date = parse(timeString, 'h:mm a', new Date());
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  } catch (error) {
    return { hours: 0, minutes: 0 };
  }
}

// Create a date from a base date, with specified hours and minutes
export function createDateWithTime(baseDate: Date, timeString: string): Date {
  const { hours, minutes } = parseTime(timeString);
  let date = new Date(baseDate);
  date = setHours(date, hours);
  date = setMinutes(date, minutes);
  return date;
}

// Generate time slots for a day (every 30 minutes)
export function generateTimeSlots(startHour: number = 0, endHour: number = 24, intervalMinutes: number = 30): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  let time = setHours(setMinutes(now, 0), startHour);
  
  while (time.getHours() < endHour) {
    slots.push(new Date(time));
    time = addMinutes(time, intervalMinutes);
  }
  
  return slots;
}

// Check if a time slot is available based on existing events
export function isTimeSlotAvailable(
  date: Date, 
  events: Event[], 
  durationMinutes: number = 30
): boolean {
  const slotStart = new Date(date);
  const slotEnd = addMinutes(slotStart, durationMinutes);
  
  return !events.some(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    
    // Check for overlap
    return (slotStart < eventEnd && slotEnd > eventStart);
  });
}

// Group events by day for week view
export function groupEventsByDay(events: Event[]): Record<string, Event[]> {
  return events.reduce((acc, event) => {
    const day = new Date(event.startTime).getDay();
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
}
