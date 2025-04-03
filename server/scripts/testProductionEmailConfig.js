/**
 * Production Email Configuration Test
 * 
 * This script simulates a production environment and tests the email configuration
 * to verify that our solution properly configures the SMTP settings.
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// First, clear any existing environment variables to simulate a clean slate
delete process.env.FROM_EMAIL;
delete process.env.SMTP_HOST;
delete process.env.SMTP_PORT;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.SMTP_SECURE;

// Set NODE_ENV to production to trigger production-mode logic
process.env.NODE_ENV = 'production';

console.log('=== Testing Production Email Configuration ===');
console.log('Setting up a clean environment to simulate production');

// Now, import our environment loader
import { loadEnvironment } from '../utils/loadEnvironment.js';

// Call the loadEnvironment function to set up the environment
const config = loadEnvironment();

console.log('\n=== Environment Configuration Results ===');
console.log(`FROM_EMAIL: ${config.FROM_EMAIL || 'Not set'}`);
console.log(`SMTP_HOST: ${config.SMTP_HOST || 'Not set'}`);
console.log(`SMTP_PORT: ${config.SMTP_PORT || 'Not set'}`);
console.log(`SMTP_USER: ${config.SMTP_USER || 'Not set'}`);
console.log(`SMTP_PASS: ${config.SMTP_PASS ? '[Set]' : 'Not set'}`);
console.log(`SMTP_SECURE: ${config.SMTP_SECURE || 'Not set'}`);
console.log(`Configuration Status: ${config.isConfigured ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);

if (!config.isConfigured) {
  console.error('\n❌ Email configuration is incomplete. Cannot proceed with test.');
  process.exit(1);
}

// Create a test email with diagnostics
async function sendTestEmail() {
  try {
    console.log('\n=== Attempting to Send Test Email ===');
    console.log(`Using SMTP server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`Authentication: ${process.env.SMTP_USER}`);
    console.log(`Secure connection: ${process.env.SMTP_SECURE}`);
    
    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    });
    
    // Verify the transporter can connect to the SMTP server
    console.log('Checking connection to SMTP server...');
    const connectionVerified = await transporter.verify();
    console.log(`Connection verified: ${connectionVerified ? 'YES ✅' : 'NO ❌'}`);
    
    if (!connectionVerified) {
      throw new Error('Failed to connect to SMTP server');
    }
    
    // Define the test email
    const testEmailTo = 'test@example.com'; // Replace with a test email
    const testEmail = {
      from: process.env.FROM_EMAIL,
      to: testEmailTo,
      subject: '[TEST] Production Email Configuration Test',
      text: `This is a test email sent at ${new Date().toISOString()} to verify the production email configuration.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #333;">Production Email Test</h2>
          <p>This is a test email sent from the production email configuration test script.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> Production</p>
          <p><strong>Server:</strong> ${process.env.SMTP_HOST}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            If you're seeing this, the production email configuration is working correctly.
          </p>
        </div>
      `
    };
    
    // Send the test email
    console.log(`Sending test email to ${testEmailTo}...`);
    const info = await transporter.sendMail(testEmail);
    
    console.log('\n✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    // If this was sent to ethereal, provide the URL to view it
    if (info.messageId.includes('ethereal')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Failed to send test email:');
    console.error(`Error: ${error.message}`);
    
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`Server response: ${error.response}`);
    }
    
    return false;
  }
}

// Run the test
sendTestEmail().then(success => {
  if (success) {
    console.log('\n✅ Production email configuration test completed successfully!');
    console.log('The email system should work correctly in production.');
  } else {
    console.error('\n❌ Production email configuration test failed.');
    console.error('Check the error messages above for details.');
    process.exit(1);
  }
});