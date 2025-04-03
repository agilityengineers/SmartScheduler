#!/usr/bin/env node

/**
 * Environmental Variables Test Script
 * 
 * This script tests if your environment variables are correctly set and accessible.
 * It will display the current values without exposing sensitive information.
 */

// Print header
console.log('=================================================================');
console.log('📝 ENVIRONMENT VARIABLES TEST');
console.log('=================================================================');
console.log(`TIME: ${new Date().toISOString()}`);
console.log(`WORKING DIR: ${process.cwd()}`);
console.log();

// List of variables to check
const vars = [
  'FROM_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SECURE',
  'NODE_ENV'
];

// Check and display each variable
console.log('Current Environment Variables:');
let missingVars = 0;

vars.forEach(varName => {
  const value = process.env[varName];
  
  if (value === undefined) {
    console.log(`- ${varName}: NOT SET ❌`);
    missingVars++;
  } else if (varName === 'SMTP_PASS') {
    // Don't show the actual password
    console.log(`- ${varName}: [HIDDEN] ✅`);
  } else {
    console.log(`- ${varName}: ${value} ✅`);
  }
});

console.log();

// Display validation results
if (missingVars === 0) {
  console.log('✅ All environment variables are set!');
} else {
  console.log(`❌ ${missingVars} environment variables are missing.`);
  console.log('Please set all required variables to ensure email functionality works correctly.');
  console.log('Note: Changes to environment variables require an application restart.');
}

// Display email-specific validation
console.log('\nEmail Configuration Analysis:');

if (process.env.FROM_EMAIL && process.env.SMTP_USER) {
  if (process.env.FROM_EMAIL !== process.env.SMTP_USER) {
    console.log('⚠️ Warning: FROM_EMAIL and SMTP_USER are different');
    console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL}`);
    console.log(`- SMTP_USER: ${process.env.SMTP_USER}`);
    console.log('For best deliverability, these should typically match unless your provider requires different values.');
  } else {
    console.log('✅ FROM_EMAIL and SMTP_USER match correctly.');
  }
}

console.log('\nHow to Fix Issues:');
console.log('1. Ensure all environment variables are set');
console.log('2. If using Replit, set them in Secrets tab and restart your Repl');
console.log('3. For local development, check your .env file or export them in your shell');
console.log('=================================================================');