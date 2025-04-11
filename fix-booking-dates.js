/**
 * This simple script fixes the date parsing issue in the booking endpoint
 * It edits routes.ts directly but in a very focused way
 */

import fs from 'fs';

const ROUTES_FILE = 'server/routes.ts';
// Make a backup first
fs.copyFileSync(ROUTES_FILE, 'server/routes.ts.backup');
console.log('✅ Created backup at server/routes.ts.backup');

// Read the file
let content = fs.readFileSync(ROUTES_FILE, 'utf8');
console.log('✅ Read routes.ts file');

// Find the public booking endpoint
const publicBookingPattern = "app.post('/api/public/:userPath/booking/:slug'";
if (!content.includes(publicBookingPattern)) {
  console.error('❌ Could not find the public booking endpoint');
  process.exit(1);
}
console.log('✅ Found public booking endpoint');

// Find and replace the date validation code
const originalCode = `
      // Validate the booking data
      const bookingData = insertBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        bookingLinkId: bookingLink.id
      });
      
      // Ensure the booking is within available hours
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);`;

const newCode = `
      // Log the received date data first
      console.log('[USER_PATH_BOOKING] Original startTime:', req.body.startTime);
      console.log('[USER_PATH_BOOKING] Original endTime:', req.body.endTime);
      
      // Parse the dates safely
      let parsedDates;
      try {
        parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
        console.log('[USER_PATH_BOOKING] Parsed dates successfully');
      } catch (dateError) {
        console.error('[USER_PATH_BOOKING] Date parsing error:', dateError);
        return res.status(400).json({ 
          message: 'Invalid date format in booking request',
          error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
        });
      }
      
      // Now validate with properly parsed Date objects
      let bookingData;
      try {
        bookingData = insertBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          bookingLinkId: bookingLink.id
        });
      } catch (validationError) {
        console.error('[USER_PATH_BOOKING] Validation error:', validationError);
        return res.status(400).json({ 
          message: 'Invalid booking data',
          error: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
      }
      
      // Use the parsed dates for further processing
      const startTime = parsedDates.startTime;
      const endTime = parsedDates.endTime;`;

// Replace all occurrences in the file (just to be safe)
content = content.replace(originalCode, newCode);

// Save the file
fs.writeFileSync(ROUTES_FILE, content, 'utf8');
console.log('✅ Fixed date parsing in routes.ts');
console.log('⚠️ Remember to restart the server to apply the changes');