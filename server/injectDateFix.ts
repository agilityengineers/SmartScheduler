/**
 * This script injects the date parsing fix into the routes.ts file
 */

import * as fs from 'fs';
import * as path from 'path';

// Read the original routes.ts file
const routesPath = path.join(process.cwd(), 'routes.ts');
const backupPath = path.join(process.cwd(), 'routes.ts.fixed');

console.log('Reading routes.ts file...');
let content = fs.readFileSync(routesPath, 'utf8');

// The portion to replace
const oldCode = `      // Validate the booking data
      const bookingData = insertBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        bookingLinkId: bookingLink.id
      });
      
      // Ensure the booking is within available hours
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);`;

// The new code with our fix
const newCode = `      // Log the received date data first
      console.log('[USER_PATH_BOOKING] Original startTime:', req.body.startTime);
      console.log('[USER_PATH_BOOKING] Original endTime:', req.body.endTime);
      
      // Parse the dates safely
      let parsedDates;
      try {
        parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
      } catch (dateError) {
        console.error('[USER_PATH_BOOKING] Date parsing error:', dateError);
        return res.status(400).json({ 
          message: 'Invalid date format in booking request',
          error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
        });
      }
      
      // Use the parsed dates for validation
      let bookingData;
      try {
        bookingData = insertBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          bookingLinkId: bookingLink.id
        });
        console.log('[USER_PATH_BOOKING] Successfully parsed and validated booking data');
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

// Find the function containing our target code
const bookingEndpointRegex = /app\.post\('\/api\/public\/:userPath\/booking\/:slug'[\s\S]*?\{([\s\S]*?)\}\);/;
const match = content.match(bookingEndpointRegex);

if (!match) {
  console.error('Could not find the booking endpoint in routes.ts');
  process.exit(1);
}

// Extract the function body and replace our target section
const functionBody = match[1];
const updatedFunctionBody = functionBody.replace(oldCode, newCode);

// Replace the original function body with the updated one
const updatedContent = content.replace(functionBody, updatedFunctionBody);

// Check if we successfully replaced the content
if (content === updatedContent) {
  console.error('Failed to update the content. No changes were made.');
  process.exit(1);
}

// Write the updated content to the backup file
console.log('Writing updated content to routes.ts.fixed...');
fs.writeFileSync(backupPath, updatedContent, 'utf8');

console.log('Date parsing fix has been applied. The updated file is at routes.ts.fixed');
console.log('To apply the fix, run:');
console.log('cp routes.ts.fixed routes.ts');