/**
 * Production Environment Setup Script
 * 
 * This script helps set up the correct environment variables for production
 * based on the known working values from development.
 * 
 * Usage: 
 *   node server/scripts/setProductionEnvironment.js
 * 
 * Note: This doesn't actually set environment variables in production - it 
 * generates the commands that need to be run on the production server.
 */

import fs from 'fs';
import dotenv from 'dotenv';

// Try to load .env file if it exists
try {
  if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded configuration from .env file');
  }
} catch (err) {
  console.error('Error loading .env file:', err.message);
}

// Production SMTP values
const PROD_SMTP_CONFIG = {
  FROM_EMAIL: 'noreply@mysmartscheduler.co',
  SMTP_HOST: 'server.pushbutton-hosting.com',
  SMTP_PORT: '465',
  SMTP_USER: 'noreply@mysmartscheduler.co',
  SMTP_SECURE: 'true'
};

// Current environment values
const currentConfig = {
  FROM_EMAIL: process.env.FROM_EMAIL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE
};

console.log('========================================================');
console.log('📋 PRODUCTION ENVIRONMENT SETUP');
console.log('========================================================');

console.log('\nCurrent environment configuration:');
for (const [key, value] of Object.entries(currentConfig)) {
  if (key === 'SMTP_PASS') {
    console.log(`- ${key}: ${value ? '[set]' : '[not set]'}`);
  } else {
    console.log(`- ${key}: ${value || '[not set]'}`);
  }
}

// Generate production environment commands
console.log('\n========================================================');
console.log('📋 PRODUCTION SETUP INSTRUCTIONS');
console.log('========================================================');
console.log('\nTo set up your production environment, use these environment variables:');
console.log('\n```');

// Add the fixed production values
for (const [key, value] of Object.entries(PROD_SMTP_CONFIG)) {
  console.log(`${key}=${value}`);
}

// Add the SMTP_PASS from the current environment if it exists
if (process.env.SMTP_PASS) {
  console.log(`SMTP_PASS=${process.env.SMTP_PASS}`);
} else {
  console.log('# SMTP_PASS=<your-secure-password>  # Replace with your actual password');
}

console.log('```');

// Generate instructions based on common hosting platforms
console.log('\n## Setting Environment Variables in Production');
console.log('\n### Option 1: Using a .env file');
console.log('Create a .env file in your production environment with the above variables.');

console.log('\n### Option 2: Using Hosting Provider Dashboard');
console.log('Most hosting providers have a section to set environment variables:');
console.log('- **Vercel**: Go to Project Settings → Environment Variables');
console.log('- **Heroku**: Go to Settings → Config Vars');
console.log('- **Netlify**: Go to Site settings → Build & deploy → Environment');
console.log('- **DigitalOcean**: Go to App → Settings → Environment Variables');

console.log('\n### Option 3: Command Line');
console.log('Set the variables directly before starting your application:');
console.log('\n```bash');
for (const [key, value] of Object.entries(PROD_SMTP_CONFIG)) {
  console.log(`export ${key}=${value}`);
}
if (process.env.SMTP_PASS) {
  console.log(`export SMTP_PASS=${process.env.SMTP_PASS}`);
} else {
  console.log('export SMTP_PASS=<your-secure-password>  # Replace with your actual password');
}
console.log('```');

// Verification instructions
console.log('\n========================================================');
console.log('📋 VERIFICATION INSTRUCTIONS');
console.log('========================================================');

console.log('\nAfter setting up your production environment, verify it works:');
console.log('\n1. Test environment variables:');
console.log('```bash');
console.log('NODE_ENV=production node server/scripts/testProductionEnvironment.js');
console.log('```');

console.log('\n2. Test email sending:');
console.log('```bash');
console.log('NODE_ENV=production node server/scripts/testProductionEmailDelivery.js your@email.com');
console.log('```');

console.log('\n3. Test registration flow:');
console.log('```bash');
console.log('NODE_ENV=production node server/scripts/testProductionRegistration.js your@email.com');
console.log('```');

console.log('\n========================================================');