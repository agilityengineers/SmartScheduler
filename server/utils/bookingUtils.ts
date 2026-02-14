import { z } from "zod";
import { insertBookingSchema } from "../../shared/schema";

/**
 * Enhanced booking schema with date handling for string inputs
 * This wraps the regular insertBookingSchema but adds preprocessing
 * to convert ISO date strings to Date objects
 */
export const enhancedBookingSchema = z.object({
  bookingLinkId: z.number(),
  name: z.string(),
  email: z.string().email(),
  startTime: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]),
  endTime: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]),
  notes: z.string().optional(),
  status: z.string().optional(),
  eventId: z.number().optional(),
  assignedUserId: z.number().optional()
});

/**
 * Type-safe wrapper for validating and parsing booking data
 * This handles date format conversion from strings to Date objects
 */
export function parseBookingData(data: any, options?: { omit?: string[] }) {
  try {
    // Apply schema with preprocessing for dates
    let schema = enhancedBookingSchema;
    
    // Omit fields if specified in options
    if (options?.omit && options.omit.length > 0) {
      const omitObject: Record<string, true> = {};
      options.omit.forEach(field => {
        omitObject[field] = true;
      });
      schema = schema.omit(omitObject as any) as any;
    }
    
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
    console.error('[BOOKING_UTILS] Validation error:', error);
    return {
      success: false,
      error
    };
  }
}