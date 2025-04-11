/**
 * Date utility functions for handling date conversions and parsing
 */

/**
 * Safely converts a string or Date into a proper Date object
 * Returns null if the input cannot be converted to a valid date
 */
export function safeParseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  
  try {
    // If it's already a Date, return it
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    // Try to parse the string to a Date
    const parsedDate = new Date(input);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Safely parse start and end times from request body
 * Returns an object with both dates or throws an error if either is invalid
 */
export function parseBookingDates(startTimeInput: any, endTimeInput: any): { startTime: Date, endTime: Date } {
  const startTime = safeParseDate(startTimeInput);
  const endTime = safeParseDate(endTimeInput);
  
  if (!startTime) {
    throw new Error('Invalid start time format');
  }
  
  if (!endTime) {
    throw new Error('Invalid end time format');
  }
  
  return { startTime, endTime };
}