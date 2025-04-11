#!/bin/bash

# Create a backup of the original routes.ts file
cp server/routes.ts server/routes.ts.bak

# Apply the necessary changes to fix date handling in the booking endpoint
cat > /tmp/booking_fix.txt << 'EOL'
      // Create an enhanced schema with date conversion
      const enhancedBookingSchema = z.object({
        bookingLinkId: z.number(),
        name: z.string(),
        email: z.string().email(),
        startTime: z.union([
          z.string().transform(val => new Date(val)),
          z.date()
        ]),
        endTime: z.union([
          z.string().transform(val => new Date(val)),
          z.date()
        ]),
        notes: z.string().optional(),
        status: z.string().optional(),
        eventId: z.number().optional(),
        assignedUserId: z.number().optional()
      });

      // Validate and convert date strings to Date objects
      let bookingData;
      try {
        bookingData = enhancedBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          bookingLinkId: bookingLink.id
        });
        
        console.log('[USER_PATH_BOOKING] Successfully parsed booking data with dates', {
          startTime: bookingData.startTime instanceof Date ? bookingData.startTime.toISOString() : 'Not a date',
          endTime: bookingData.endTime instanceof Date ? bookingData.endTime.toISOString() : 'Not a date'
        });
      } catch (error) {
        console.error('[USER_PATH_BOOKING] Validation error:', error);
        return res.status(400).json({ 
          message: 'Invalid booking data', 
          error: error instanceof Error ? error.message : 'Validation failed' 
        });
      }
      
      // Now we have proper Date objects for startTime and endTime
      const startTime = bookingData.startTime;
      const endTime = bookingData.endTime;
EOL

# Import z at the beginning of the file if not already there
grep -q "import { z } from 'zod';" server/routes.ts || 
  sed -i '1s/^/import { z } from "zod";\n/' server/routes.ts

# Replace the problematic section
sed -i '6837,6845c\
'"$(cat /tmp/booking_fix.txt)"'' server/routes.ts

echo "Date handling fix applied to booking endpoint. Original file backed up as server/routes.ts.bak."