/**
 * Test script to specifically check password reset emails for user 'cwilliams'
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';

// Initialize dotenv
dotenv.config();

async function testUserReset() {
  console.log('🔍 TESTING PASSWORD RESET FOR PROBLEMATIC USER');
  
  const userEmail = 'emailme@clarencewilliams.com';
  const username = 'cwilliams';
  
  console.log(`📧 Target email: ${userEmail}`);
  console.log(`👤 Target username: ${username}`);
  
  // Generate a test reset token
  const testToken = crypto.randomBytes(32).toString('hex');
  console.log(`🔑 Test token: ${testToken.substring(0, 10)}...`);
  
  // Create reset link with production domain directly to frontend route
  const productionDomain = "https://smart-scheduler.ai";
  const resetLink = `${productionDomain}/set-new-password?token=${testToken}`;
  console.log(`🔗 Reset link: ${resetLink}`);
  
  // Print email configuration
  console.log('\n📋 EMAIL CONFIGURATION:');
  console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || 'not set'}`);
  console.log(`- SMTP configured: ${!!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)}`);
  console.log(`- Google Email configured: ${!!(process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD)}`);
  
  // Try using direct Google Email configuration (Gmail SMTP)
  if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD) {
    console.log('\n🔄 Attempting to send via direct Gmail SMTP...');
    
    try {
      // Create direct Gmail transport
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GOOGLE_EMAIL,
          pass: process.env.GOOGLE_EMAIL_PASSWORD
        }
      });
      
      // Verify connection
      await transport.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
      
      // Create email HTML
      const html = getPasswordResetHtml(resetLink);
      
      // Send the email
      const info = await transport.sendMail({
        from: `"${process.env.GOOGLE_EMAIL_NAME || 'SmartScheduler'}" <${process.env.GOOGLE_EMAIL}>`,
        to: userEmail,
        subject: 'Reset Your Password',
        text: `Click this link to reset your password: ${resetLink}`,
        html: html,
      });
      
      console.log(`✅ Test email sent successfully via Gmail SMTP!`);
      console.log(`- Message ID: ${info.messageId}`);
      console.log(`- Response: ${JSON.stringify(info.response)}`);
      console.log('\n✅ TEST SUCCESSFUL - Please check the email inbox for the test message');
      
      return true;
    } catch (error) {
      console.error(`❌ Gmail SMTP error: ${error.message}`);
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
    }
  } else {
    console.log('\n❌ Google Email not configured - cannot run test');
  }
  
  console.log('\n⚠️ TEST FAILED - Could not deliver test email');
  return false;
}

/**
 * Generates the HTML content for a password reset email
 * @param resetLink The link for resetting the password
 * @returns HTML content
 */
function getPasswordResetHtml(resetLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>You've requested to reset your password for your My Smart Scheduler account.</p>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Reset My Password</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>Why am I receiving this email?</strong></p>
        <p>You are receiving this email because a password reset was requested for your My Smart Scheduler account. If you didn't make this request, you can safely ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is a transactional email sent from an automated system. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Run the test
testUserReset()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });