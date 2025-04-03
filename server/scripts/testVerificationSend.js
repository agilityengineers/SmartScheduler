#!/usr/bin/env node

/**
 * Email Verification Test Script
 * 
 * This script tests sending a verification email through the SMTP server
 * using the configured environment variables.
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a verification token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate a verification URL
function generateVerificationUrl(token) {
  const baseUrl = process.env.BASE_URL || 'https://mysmartscheduler.co';
  return `${baseUrl}/verify-email?token=${token}`;
}

// Create an HTML email template with the verification link
function createEmailTemplate(verificationUrl, username = 'User') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; }
    .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Verification</h1>
    </div>
    <div class="content">
      <p>Hello ${username},</p>
      <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p style="word-break: break-all;">${verificationUrl}</p>
    </div>
    <div class="footer">
      <p>This is a test email sent from Smart Scheduler's email verification system.</p>
      <p>&copy; ${new Date().getFullYear()} Smart Scheduler. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Main function
async function main() {
  console.log('=================================================================');
  console.log('📧 EMAIL VERIFICATION TEST');
  console.log('=================================================================');
  console.log(`TIME: ${new Date().toISOString()}`);
  
  // Read test email address from command line args
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.log('❌ Error: Missing test email address');
    console.log('Usage: node testVerificationSend.js your-email@example.com');
    process.exit(1);
  }
  
  console.log(`Sending test verification email to: ${testEmail}`);
  
  // Check for required environment variables
  const fromEmail = process.env.FROM_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  if (!fromEmail || !smtpHost || !smtpUser || !smtpPass) {
    console.log('❌ Missing required environment variables:');
    console.log(`FROM_EMAIL: ${fromEmail ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`SMTP_HOST: ${smtpHost ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT ? process.env.SMTP_PORT : '587 (default)'}`);
    console.log(`SMTP_USER: ${smtpUser ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`SMTP_PASS: ${smtpPass ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'false (default)'}`);
    process.exit(1);
  }
  
  // Create a verification token and URL
  const token = generateToken();
  const verificationUrl = generateVerificationUrl(token);
  console.log(`Generated verification URL: ${verificationUrl}`);
  
  // Create an email template
  const htmlContent = createEmailTemplate(verificationUrl);
  
  // Save the email content to a file for inspection
  const emailFile = path.join(__dirname, '..', 'verification-test.html');
  fs.writeFileSync(emailFile, htmlContent);
  console.log(`Email template saved to: ${emailFile}`);
  
  // Configure the transporter
  console.log(`\nConfiguring SMTP transporter with:`);
  console.log(`Host: ${smtpHost}`);
  console.log(`Port: ${smtpPort}`);
  console.log(`Secure: ${smtpSecure}`);
  console.log(`User: ${smtpUser}`);
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    debug: true // Enable for verbose output
  });
  
  try {
    // Verify SMTP connection
    console.log('\nVerifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send the email
    console.log(`\nSending test verification email to ${testEmail}...`);
    const mailOptions = {
      from: `Smart Scheduler <${fromEmail}>`,
      to: testEmail,
      subject: 'Smart Scheduler - Verify Your Email',
      html: htmlContent,
      text: `Hello! Please verify your email by clicking this link: ${verificationUrl}`
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    if (info.accepted && info.accepted.length) {
      console.log(`Accepted recipients: ${info.accepted.join(', ')}`);
    }
    
    if (info.rejected && info.rejected.length) {
      console.log(`⚠️ Rejected recipients: ${info.rejected.join(', ')}`);
    }
    
    console.log('\n=== VERIFICATION TEST SUMMARY ===');
    console.log('✅ Verification email sent successfully!');
    console.log(`Please check ${testEmail} for the verification email.`);
    console.log('The email should contain a verification link that, when clicked, would verify your account.');
  } catch (error) {
    console.log(`❌ Error sending email: ${error.message}`);
    if (error.code === 'EAUTH') {
      console.log('Authentication failed. Please check your SMTP username and password.');
    }
    if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      console.log('Connection to SMTP server failed. Please check your SMTP host and port settings.');
    }
    console.log('Detailed error:');
    console.log(error);
  }
  
  console.log('=================================================================');
}

// Run the script
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});