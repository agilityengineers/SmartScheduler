/**
 * Production Registration Email Test
 * 
 * This script tests the registration email verification flow in the production environment.
 * It sends a verification email identical to what would be sent during real user registration.
 * 
 * Usage: NODE_ENV=production node server/scripts/testProductionRegistration.js test@example.com
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';

// Get recipient email from command line
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: No test email provided');
  console.error('Usage: NODE_ENV=production node server/scripts/testProductionRegistration.js test@example.com');
  process.exit(1);
}

console.log('========================================================');
console.log('📧 PRODUCTION REGISTRATION EMAIL TEST');
console.log(`🕒 ${new Date().toISOString()}`);
console.log('========================================================');

console.log(`\nRunning with NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`Testing registration email for: ${testEmail}`);

/**
 * Generate a verification token just like in the real registration flow
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a verification link just like in the real registration flow
 */
function generateVerificationLink(email, token) {
  const baseUrl = process.env.BASE_URL || 'https://mysmartscheduler.co';
  return `${baseUrl}/verify-email?email=${encodeURIComponent(email)}&token=${token}`;
}

/**
 * Create the verification email HTML
 */
function createVerificationEmailHtml(userName, verificationLink) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a86e8;">Verify Your Email Address</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for registering with SmartScheduler. Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${verificationLink}" style="background-color: #4a86e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify My Email
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
        ${verificationLink}
      </p>
      
      <p>This link will expire in 24 hours.</p>
      
      <p>If you didn't register for an account, please ignore this email.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #777; font-size: 12px;">
        This is an automated message from SmartScheduler. Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * Create the verification email text version
 */
function createVerificationEmailText(userName, verificationLink) {
  return `
Hi ${userName},

Thank you for registering with SmartScheduler. Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 24 hours.

If you didn't register for an account, please ignore this email.

This is an automated message from SmartScheduler. Please do not reply to this email.
  `;
}

/**
 * Send a test verification email
 */
async function sendTestVerificationEmail() {
  // Extract username from email
  const userName = testEmail.split('@')[0];
  
  // Generate a test verification token
  const verificationToken = generateVerificationToken();
  
  // Generate verification link
  const verificationLink = generateVerificationLink(testEmail, verificationToken);
  
  // Create email content
  const htmlContent = createVerificationEmailHtml(userName, verificationLink);
  const textContent = createVerificationEmailText(userName, verificationLink);
  
  // Get email configuration from environment variables
  const emailConfig = {
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co',
    SMTP_HOST: process.env.SMTP_HOST || 'server.pushbutton-hosting.com',
    SMTP_PORT: process.env.SMTP_PORT || '465',
    SMTP_USER: process.env.SMTP_USER || 'noreply@mysmartscheduler.co',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_SECURE: process.env.SMTP_SECURE || 'true'
  };
  
  // Check if configuration is complete
  const isConfigured = !!(
    emailConfig.FROM_EMAIL &&
    emailConfig.SMTP_HOST &&
    emailConfig.SMTP_USER &&
    emailConfig.SMTP_PASS
  );
  
  // Print debug info
  console.log('\n📋 EMAIL CONFIGURATION:');
  console.log(`- FROM_EMAIL: ${emailConfig.FROM_EMAIL}`);
  console.log(`- SMTP_HOST: ${emailConfig.SMTP_HOST}`);
  console.log(`- SMTP_PORT: ${emailConfig.SMTP_PORT}`);
  console.log(`- SMTP_USER: ${emailConfig.SMTP_USER}`);
  console.log(`- SMTP_PASS: ${emailConfig.SMTP_PASS ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_SECURE: ${emailConfig.SMTP_SECURE}`);
  console.log(`- Configuration complete: ${isConfigured ? 'Yes' : 'No'}`);
  
  // Check if configuration is complete
  if (!isConfigured) {
    console.error('\n❌ Email configuration is incomplete. Cannot send verification email.');
    console.error('   Please set all required environment variables (FROM_EMAIL, SMTP_HOST, SMTP_USER, SMTP_PASS).');
    return false;
  }
  
  // Create transporter
  console.log('\n🔄 Creating SMTP transporter...');
  const transporter = nodemailer.createTransport({
    host: emailConfig.SMTP_HOST,
    port: parseInt(emailConfig.SMTP_PORT),
    secure: emailConfig.SMTP_SECURE === 'true',
    auth: {
      user: emailConfig.SMTP_USER,
      pass: emailConfig.SMTP_PASS
    },
    debug: true,
    logger: true
  });
  
  try {
    // Verify connection
    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send email
    console.log(`🔄 Sending verification email to ${testEmail}...`);
    const info = await transporter.sendMail({
      from: `"SmartScheduler" <${emailConfig.FROM_EMAIL}>`,
      to: testEmail,
      subject: "Verify Your Email Address",
      text: textContent,
      html: htmlContent
    });
    
    console.log('✅ Verification email sent successfully!');
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Verification link: ${verificationLink}`);
    
    return true;
  } catch (error) {
    console.error(`\n❌ Failed to send verification email: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Error Details:');
      console.error('- This is often caused by incorrect SMTP_USER or SMTP_PASS values');
      console.error('- Make sure the SMTP_PASS environment variable is set correctly in production');
      console.error('- Try manually testing the same credentials in an email client');
    }
    
    return false;
  }
}

// Run the test
sendTestVerificationEmail()
  .then(success => {
    if (success) {
      console.log('\n✅ PRODUCTION REGISTRATION EMAIL TEST: SUCCESS');
      console.log(`   Verification email sent to ${testEmail}`);
      console.log('   Please check that mailbox to verify receipt.');
      process.exit(0);
    } else {
      console.error('\n❌ PRODUCTION REGISTRATION EMAIL TEST: FAILED');
      console.error('   See above errors for details.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ UNEXPECTED ERROR:', error);
    process.exit(1);
  });