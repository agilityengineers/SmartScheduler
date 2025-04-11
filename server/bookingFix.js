/**
 * This script applies the date parsing fix to the routes.ts file
 * It specifically targets the public booking endpoint at line ~6838
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the original routes.ts file
const routesPath = path.join(__dirname, 'routes.ts');
const backupPath = path.join(__dirname, 'routes.ts.backup');

console.log('Backing up original routes.ts file...');
fs.copyFileSync(routesPath, backupPath);
console.log(`Backup created at ${backupPath}`);

console.log('Reading routes.ts file...');
const routesContent = fs.readFileSync(routesPath, 'utf8');

// Split into lines for easier processing
const lines = routesContent.split('\n');

// Find the public booking endpoint
const bookingEndpointIndex = lines.findIndex(line => 
  line.includes("app.post('/api/public/:userPath/booking/:slug'")
);

if (bookingEndpointIndex === -1) {
  console.error('Error: Could not find the public booking endpoint');
  process.exit(1);
}

console.log(`Found public booking endpoint at line ${bookingEndpointIndex + 1}`);

// Find the date validation section
let validateSectionIndex = -1;
for (let i = bookingEndpointIndex; i < lines.length; i++) {
  if (lines[i].includes('// Validate the booking data') && 
      lines[i+1] && lines[i+1].includes('const bookingData = insertBookingSchema')) {
    validateSectionIndex = i;
    break;
  }
}

if (validateSectionIndex === -1) {
  console.error('Error: Could not find the booking data validation section');
  process.exit(1);
}

console.log(`Found booking data validation section at line ${validateSectionIndex + 1}`);

// The replacement code with our fix
const dateParsingFix = [
  '      // First parse the date strings into Date objects',
  '      console.log(\'[USER_PATH_BOOKING] Original startTime:\', req.body.startTime);',
  '      console.log(\'[USER_PATH_BOOKING] Original endTime:\', req.body.endTime);',
  '      ',
  '      try {',
  '        // Use our date utility to properly parse dates',
  '        const parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);',
  '        ',
  '        // Validate the booking data with pre-parsed dates',
  '        const bookingData = insertBookingSchema.omit({ eventId: true }).parse({',
  '          ...req.body,',
  '          startTime: parsedDates.startTime,',
  '          endTime: parsedDates.endTime,',
  '          bookingLinkId: bookingLink.id',
  '        });',
  '        ',
  '        console.log(\'[USER_PATH_BOOKING] Parsed and validated booking data\');',
  '        ',
  '        // Use the parsed dates for further processing',
  '        const startTime = parsedDates.startTime;',
  '        const endTime = parsedDates.endTime;'
];

// The lines to replace (9 lines including comments and blank lines)
const linesToReplace = 9;

// Replace the validation section with our fix
lines.splice(validateSectionIndex, linesToReplace, ...dateParsingFix);

// Find a good spot to add the catch block
// Look for duration calculation
let durationCalcIndex = -1;
for (let i = validateSectionIndex + dateParsingFix.length; i < lines.length; i++) {
  if (lines[i].includes('durationMinutes = (endTime.getTime() - startTime.getTime())')) {
    durationCalcIndex = i;
    break;
  }
}

if (durationCalcIndex === -1) {
  console.error('Warning: Could not find duration calculation. Adding catch block at end of validation section.');
  durationCalcIndex = validateSectionIndex + dateParsingFix.length;
}

console.log(`Adding catch block after line ${durationCalcIndex + 2}`);

// Add the catch block after the duration calculation
const catchBlock = [
  '      } catch (dateError) {',
  '        console.error(\'[USER_PATH_BOOKING] Date parsing error:\', dateError);',
  '        return res.status(400).json({ ',
  '          message: \'Invalid date format in booking request\',',
  '          error: dateError instanceof Error ? dateError.message : \'Failed to parse dates\'',
  '        });',
  '      }'
];

// Insert the catch block
lines.splice(durationCalcIndex + 1, 0, ...catchBlock);

// Write the modified file
console.log('Writing modified routes.ts file...');
fs.writeFileSync(routesPath, lines.join('\n'), 'utf8');
console.log('Date parsing fix applied successfully!');