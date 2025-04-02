/**
 * Email Verification Test Script
 * 
 * This script tests sending an email verification message
 * using the current SMTP configuration.
 * 
 * Usage: node server/scripts/testVerificationEmail.js <test-email-address>
 */

import { emailService } from '../utils/emailService.js';
import { getVerificationEmailTemplate } from '../utils/emailTemplateHelpers.js';

// Get test email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('Please provide a test email address as an argument');
  console.error('Example: node server/scripts/testVerificationEmail.js test@example.com');
  process.exit(1);
}

console.log(`=== Email Verification Test ===`);
console.log(`Sending a test verification email to: ${testEmail}`);
console.log(`Using FROM_EMAIL: ${emailService.getFromEmail()}`);
console.log('\nPlease wait...\n');

const verifyLink = `https://mysmartscheduler.co/verify-email?token=TEST_TOKEN_123&id=TEST_USER_456`;
const { subject, text, html } = getVerificationEmailTemplate(verifyLink);

emailService.sendEmailVerificationEmail(testEmail, verifyLink)
  .then(result => {
    console.log('==== EMAIL SEND RESULTS ====');
    
    if (result.success) {
      console.log('✅ Verification email sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Method: ${result.method}`);
    } else {
      console.log('❌ Failed to send verification email');
      
      if (result.error) {
        console.log(`Error: ${result.error.message}`);
        if (result.error.code) {
          console.log(`Error code: ${result.error.code}`);
        }
        if (result.error.details) {
          console.log('Error details:', result.error.details);
        }
      }
      
      if (result.smtpDiagnostics) {
        console.log('\nSMTP diagnostics:');
        console.log(`- Configuration detected: ${result.smtpDiagnostics.configured ? 'Yes' : 'No'}`);
        console.log(`- Send attempt made: ${result.smtpDiagnostics.attempted ? 'Yes' : 'No'}`);
        
        if (result.smtpDiagnostics.error) {
          console.log(`- Error: ${result.smtpDiagnostics.error}`);
        }
        
        if (result.smtpDiagnostics.host) {
          console.log(`- Host: ${result.smtpDiagnostics.host}`);
          console.log(`- Port: ${result.smtpDiagnostics.port}`);
          console.log(`- User: ${result.smtpDiagnostics.user}`);
          console.log(`- Secure: ${result.smtpDiagnostics.secure ? 'Yes' : 'No'}`);
        }
      }
    }
    
    console.log('\nNext steps:');
    if (result.success) {
      console.log('1. Check the test email inbox to confirm receipt');
      console.log('2. Verify that the email formatting looks good');
      console.log('3. Test clicking the verification link (it will be a fake test link)');
    } else {
      console.log('1. Check your SMTP configuration (run testSmtpDiagnostics.js first)');
      console.log('2. Verify the FROM_EMAIL is properly set up with MX, SPF, and DMARC records');
      console.log('3. Try with a different email provider if needed');
    }
  })
  .catch(error => {
    console.error('Unexpected error occurred:', error);
  });