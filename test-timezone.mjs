import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

// Get the current directory 
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the source file directly
const timezoneFilePath = join(__dirname, 'shared', 'timezones.ts');
const timezoneSource = fs.readFileSync(timezoneFilePath, 'utf8');

// Extract the getCurrentTimezoneOffset function
const getCurrentTimezoneOffsetFn = `
function getCurrentTimezoneOffset(tzId, date = new Date()) {
  try {
    // Get the offset in minutes
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzId,
      timeZoneName: 'short'
    });
    
    // Format the date in the specified timezone to get the abbreviation that includes DST info
    const tzInfo = formatter.formatToParts(date).find(part => part.type === 'timeZoneName');
    const tzName = tzInfo?.value || '';
    
    // Calculate the offset in minutes
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tzId }));
    const offsetInMinutes = (utcDate.getTime() - tzDate.getTime()) / (60 * 1000);
    
    // Format the offset string
    const sign = offsetInMinutes <= 0 ? '+' : '-'; // Note: The sign is inverted because of how JS calculates TZ offset
    const absMinutes = Math.abs(offsetInMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    
    return \`\${sign}\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}\`;
  } catch (error) {
    console.error(\`Error getting offset for \${tzId}:\`, error);
    return '+00:00';
  }
}
`;

// Create a function from the source code
const getCurrentTimezoneOffset = new Function('tzId', 'date', 
  getCurrentTimezoneOffsetFn.substring(getCurrentTimezoneOffsetFn.indexOf('{')+1, getCurrentTimezoneOffsetFn.lastIndexOf('}'))
);

// Test for a date in winter (EST)
const winterDate = new Date('2025-01-15T12:00:00Z');
console.log('New York in winter (should be -05:00):', getCurrentTimezoneOffset('America/New_York', winterDate));

// Test for a date in summer (EDT)
const summerDate = new Date('2025-07-15T12:00:00Z');
console.log('New York in summer (should be -04:00):', getCurrentTimezoneOffset('America/New_York', summerDate));
