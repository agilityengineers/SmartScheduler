const path = require('path');
// Import the timezone utilities
const { getCurrentTimezoneOffset } = require(path.join(__dirname, 'shared', 'timezones'));

// Test for a date in winter (EST)
const winterDate = new Date('2025-01-15T12:00:00Z');
console.log('New York in winter (should be -05:00):', getCurrentTimezoneOffset('America/New_York', winterDate));

// Test for a date in summer (EDT)
const summerDate = new Date('2025-07-15T12:00:00Z');
console.log('New York in summer (should be -04:00):', getCurrentTimezoneOffset('America/New_York', summerDate));
