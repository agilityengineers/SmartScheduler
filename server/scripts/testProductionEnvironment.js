/**
 * Production Environment Test
 * 
 * This script tests if environment variables are correctly set in the production environment.
 * It helps troubleshoot issues where credentials work in development but fail in production.
 * 
 * Usage: NODE_ENV=production node server/scripts/testProductionEnvironment.js
 */

// Log environment status
console.log('========================================================');
console.log('📧 PRODUCTION ENVIRONMENT VARIABLES TEST');
console.log(`🕒 ${new Date().toISOString()}`);
console.log('========================================================');

// Check NODE_ENV
console.log(`\nCurrent NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ Warning: Not running in production mode. Set NODE_ENV=production to test production environment.');
}

// Check email-related environment variables
console.log('\n📋 EMAIL CONFIGURATION VARIABLES:');
console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || 'not set'}`);
console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER || 'not set'}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[set]' : '[not set]'}`);
console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || 'not set'}`);

// Load expected production values
const EXPECTED_VALUES = {
  FROM_EMAIL: 'noreply@mysmartscheduler.co',
  SMTP_HOST: 'server.pushbutton-hosting.com',
  SMTP_PORT: '465',
  SMTP_USER: 'noreply@mysmartscheduler.co',
  SMTP_SECURE: 'true'
};

// Check if environment variables match expected values
console.log('\n📋 CONFIGURATION COMPARISON:');
let configCorrect = true;

for (const [key, expectedValue] of Object.entries(EXPECTED_VALUES)) {
  const actualValue = process.env[key] || 'not set';
  const matches = actualValue === expectedValue;
  
  if (key === 'SMTP_PASS') {
    // Don't compare actual password value, just check if it's set
    console.log(`- ${key}: ${process.env[key] ? '[set]' : '[not set]'} ${process.env[key] ? '✓' : '✗'}`);
    if (!process.env[key]) {
      configCorrect = false;
    }
  } else {
    console.log(`- ${key}: ${matches ? '✓' : '✗'} ${matches ? '' : `(expected: "${expectedValue}", actual: "${actualValue}")`}`);
    if (!matches) {
      configCorrect = false;
    }
  }
}

// Print summary
console.log('\n📋 CONFIGURATION SUMMARY:');
if (configCorrect) {
  console.log('✅ All configuration values match expected production values.');
} else {
  console.log('❌ Some configuration values DO NOT match expected production values.');
  console.log('   See above for details on which values need to be corrected.');
}

// Check if SMTP_PASS is correctly set
if (!process.env.SMTP_PASS) {
  console.log('\n❌ CRITICAL ISSUE: SMTP_PASS is not set!');
  console.log('   This is the most common cause of authentication failures in production.');
  console.log('   Make sure to set the correct SMTP password in your production environment.');
} else {
  // Print first and last character of password for minimal verification without exposing full password
  const pass = process.env.SMTP_PASS;
  const firstChar = pass.charAt(0);
  const lastChar = pass.charAt(pass.length - 1);
  const length = pass.length;
  
  console.log('\n📋 SMTP_PASS VERIFICATION:');
  console.log(`- Length: ${length} characters`);
  console.log(`- First character: "${firstChar}"`);
  console.log(`- Last character: "${lastChar}"`);
  console.log(`- Contains special characters: ${/[!@#$%^&*(),.?":{}|<>]/.test(pass) ? 'Yes' : 'No'}`);
  
  if (length < 8) {
    console.log('⚠️ Warning: Password seems unusually short. Verify it matches the expected value.');
  }
}

// Instructions for correcting issues
console.log('\n📋 NEXT STEPS:');
if (!configCorrect) {
  console.log('1. Set the correct environment variables in your production environment.');
  console.log('2. Most hosting providers have a "Environment Variables" or "Secrets" section in their dashboard.');
  console.log('3. Make sure the SMTP_PASS is set correctly - this is the most common issue.');
  console.log('4. Run this test again to verify the configuration.');
  console.log('\nExample configuration:');
  console.log('FROM_EMAIL=noreply@mysmartscheduler.co');
  console.log('SMTP_HOST=server.pushbutton-hosting.com');
  console.log('SMTP_PORT=465');
  console.log('SMTP_USER=noreply@mysmartscheduler.co');
  console.log('SMTP_PASS=<your-secure-password>');
  console.log('SMTP_SECURE=true');
} else {
  console.log('1. Run the production email test to verify email delivery:');
  console.log('   NODE_ENV=production node server/scripts/testProductionEmailDelivery.js your-email@example.com');
  console.log('2. Check for other potential issues if email delivery still fails:');
  console.log('   - Network/firewall restrictions');
  console.log('   - Rate limiting');
  console.log('   - Account restrictions');
}

console.log('\n========================================================');