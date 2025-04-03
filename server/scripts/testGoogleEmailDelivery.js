/**
 * Google Email Delivery Tester
 * 
 * Use this script to test Google Enterprise Email (Gmail for Work) delivery.
 * This will help verify that your Google Email credentials are working correctly.
 * 
 * Usage:
 * node server/scripts/testGoogleEmailDelivery.js your-test-email@example.com
 */

// Load environment variables
require('dotenv').config();

const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

// Default configuration for Gmail
const GOOGLE_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

async function testGoogleEmailDelivery() {
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`${colors.cyan}  GOOGLE EMAIL DELIVERY TEST UTILITY  ${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}\n`);

  // Get test email from command line args or use default
  const testEmail = process.argv[2] || 'test@example.com';

  // Check for required variables
  if (!process.env.GOOGLE_EMAIL || !process.env.GOOGLE_EMAIL_PASSWORD) {
    console.error(`${colors.red}❌ ERROR: Missing required environment variables.${colors.reset}`);
    console.error(`${colors.yellow}Please set the following environment variables:${colors.reset}`);
    console.error(`- GOOGLE_EMAIL: Your Google Workspace email address (e.g., noreply@yourdomain.com)`);
    console.error(`- GOOGLE_EMAIL_PASSWORD: Your Google account password or app password\n`);
    console.error(`${colors.yellow}Optional environment variables:${colors.reset}`);
    console.error(`- GOOGLE_EMAIL_NAME: Display name for your email (e.g., "My Smart Scheduler")`);
    process.exit(1);
  }

  console.log(`${colors.blue}1️⃣  Checking Google Email Configuration...${colors.reset}`);
  console.log(`- GOOGLE_EMAIL: ${colors.green}${process.env.GOOGLE_EMAIL}${colors.reset}`);
  console.log(`- GOOGLE_EMAIL_PASSWORD: ${colors.green}[Set]${colors.reset}`);
  console.log(`- GOOGLE_EMAIL_NAME: ${colors.green}${process.env.GOOGLE_EMAIL_NAME || '[Not set]'}${colors.reset}`);

  // Get domain part of the email
  const emailDomain = process.env.GOOGLE_EMAIL.split('@')[1];
  
  console.log(`\n${colors.blue}2️⃣  Checking DNS records for email domain: ${emailDomain}...${colors.reset}`);
  
  try {
    // Look up MX records
    const mxRecords = await resolveMx(emailDomain);
    
    if (mxRecords && mxRecords.length > 0) {
      console.log(`${colors.green}✅ Found ${mxRecords.length} MX records for ${emailDomain}${colors.reset}`);
      
      // Check if Google's mail servers are in the MX records
      const googleMxServers = mxRecords.some(record => 
        record.exchange.includes('google') || 
        record.exchange.includes('gmail') || 
        record.exchange.includes('googlemail')
      );
      
      if (googleMxServers) {
        console.log(`${colors.green}✅ Detected Google mail servers in MX records${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ No Google mail servers detected in MX records.${colors.reset}`);
        console.log(`${colors.yellow}   This might be fine if you're using a custom setup.${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠️ No MX records found for ${emailDomain}${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error checking MX records:${colors.reset}`, error.message);
  }
  
  console.log(`\n${colors.blue}3️⃣  Testing SMTP Authentication...${colors.reset}`);
  
  // Create a transport for testing
  const transporter = nodemailer.createTransport({
    host: GOOGLE_CONFIG.host,
    port: GOOGLE_CONFIG.port,
    secure: GOOGLE_CONFIG.secure,
    auth: {
      user: process.env.GOOGLE_EMAIL,
      pass: process.env.GOOGLE_EMAIL_PASSWORD
    },
    debug: true, // Enable debug output
    logger: true, // Log information about the mail
    tls: {
      rejectUnauthorized: true // Reject invalid certs
    }
  });
  
  try {
    // Verify connection configuration
    await transporter.verify();
    console.log(`${colors.green}✅ Google SMTP Authentication Successful${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ Google SMTP Authentication Failed: ${error.message}${colors.reset}`);
    console.error('This indicates an issue with the Google Email credentials or configuration.');
    console.error('Possible causes:');
    console.error('- Incorrect GOOGLE_EMAIL or GOOGLE_EMAIL_PASSWORD');
    console.error('- 2FA is enabled and you need to use an App Password');
    console.error('- Your Google account has security restrictions');
    
    // Extra diagnostic information for authentication errors
    if (error.code === 'EAUTH') {
      console.error(`\n${colors.yellow}💡 Authentication Error Details:${colors.reset}`);
      console.error('- Check GOOGLE_EMAIL and GOOGLE_EMAIL_PASSWORD are correct');
      console.error('- If you have 2FA enabled, create an App Password at https://myaccount.google.com/apppasswords');
      console.error('- Ensure your Google Workspace account has SMTP access enabled');
    }
    
    process.exit(1);
  }
  
  console.log(`\n${colors.blue}4️⃣  Sending Test Email to ${testEmail}...${colors.reset}`);
  
  // Generate a unique test ID for tracking
  const testId = Math.random().toString(36).substring(2, 8);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.GOOGLE_EMAIL_NAME 
        ? `"${process.env.GOOGLE_EMAIL_NAME}" <${process.env.GOOGLE_EMAIL}>`
        : process.env.GOOGLE_EMAIL,
      to: testEmail,
      subject: `Test Email from Google Email Integration [${testId}]`,
      text: `
This is a test email from your Google Email integration.

Test ID: ${testId}
From: ${process.env.GOOGLE_EMAIL}
To: ${testEmail}
Time: ${new Date().toISOString()}

This confirms your Google Email integration is working correctly.
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4285F4;">Google Email Integration Test</h2>
  <p>This email confirms your Google Email integration is working correctly!</p>
  
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Test ID:</strong> ${testId}</p>
    <p><strong>From:</strong> ${process.env.GOOGLE_EMAIL}</p>
    <p><strong>To:</strong> ${testEmail}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
  </div>
  
  <p style="color: #777; font-size: 12px; margin-top: 30px;">
    This is an automated test from My Smart Scheduler.
  </p>
</div>
      `
    });
    
    console.log(`${colors.green}✅ Test email successfully sent to: ${testEmail} [Test ID: ${testId}]${colors.reset}`);
    console.log(`- Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`${colors.red}❌ Error sending test email:${colors.reset}`, error.message);
    process.exit(1);
  }
  
  console.log(`\n${colors.blue}5️⃣  Test Completed Successfully${colors.reset}`);
  console.log(`${colors.green}✅ Your Google Email configuration is working correctly!${colors.reset}`);
  console.log(`\n${colors.blue}==== IMPORTANT NEXT STEPS ====${colors.reset}`);
  console.log(`1. Check your inbox at ${colors.cyan}${testEmail}${colors.reset} for the test email`);
  console.log(`2. Ensure your email includes Test ID: ${colors.cyan}${testId}${colors.reset}`);
  console.log(`3. Set these environment variables in your production environment:`);
  console.log(`   - ${colors.cyan}GOOGLE_EMAIL=${process.env.GOOGLE_EMAIL}${colors.reset}`);
  console.log(`   - ${colors.cyan}GOOGLE_EMAIL_PASSWORD=[your-secure-password]${colors.reset}`);
  if (process.env.GOOGLE_EMAIL_NAME) {
    console.log(`   - ${colors.cyan}GOOGLE_EMAIL_NAME=${process.env.GOOGLE_EMAIL_NAME}${colors.reset}`);
  }
  console.log(`\nThank you for using the Google Email integration!`);
}

// Run the test
testGoogleEmailDelivery().catch(error => {
  console.error(`\n${colors.red}FATAL ERROR:${colors.reset}`, error);
  process.exit(1);
});