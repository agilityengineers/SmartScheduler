// Test Email Verification Script
// Run with: node server/scripts/testEmailVerification.js recipient@example.com

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email verification template
function getEmailVerificationHtml(verifyLink) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #4a86e8;">Verify Your Email Address</h2>
    <p>Thank you for signing up with My Smart Scheduler. To complete your registration, please verify your email address:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyLink}" style="display: inline-block; background-color: #4a86e8; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
        Verify My Email
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 3px; padding: 8px; background-color: #f8f9fa;">
      ${verifyLink}
    </p>
    
    <p>This verification link will expire in 24 hours.</p>
    
    <p>If you did not sign up for a My Smart Scheduler account, please ignore this email.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
      <p>This is an automated email from My Smart Scheduler. Please do not reply to this message.</p>
    </div>
  </div>
  `;
}

function getEmailVerificationText(verifyLink) {
  return `
Verify Your Email Address

Thank you for signing up with My Smart Scheduler. To complete your registration, please verify your email address by clicking on the link below:

${verifyLink}

This verification link will expire in 24 hours.

If you did not sign up for a My Smart Scheduler account, please ignore this email.

This is an automated email from My Smart Scheduler. Please do not reply to this message.
  `;
}

async function main() {
  const recipient = process.argv[2];
  
  if (!recipient) {
    console.error('Error: No recipient email provided');
    console.error('Usage: node server/scripts/testEmailVerification.js recipient@example.com');
    process.exit(1);
  }
  
  console.log(`🔍 Testing email verification to: ${recipient}`);
  
  // Generate mock verification token and link
  const token = crypto.randomBytes(32).toString('hex');
  const baseUrl = process.env.BASE_URL || 'https://smart-scheduler.ai';
  const verifyLink = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(recipient)}`;
  
  console.log(`📧 Generated verification link: ${verifyLink}`);
  
  // Load SMTP config
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json')
  ];
  
  let smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || 'noreply@smart-scheduler.ai',
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || true
  };
  
  // Ensure fromEmail has both username and domain parts
  if (smtpConfig.fromEmail.startsWith('@')) {
    smtpConfig.fromEmail = 'noreply' + smtpConfig.fromEmail;
    console.log(`⚠️ FROM_EMAIL was missing username part, using: ${smtpConfig.fromEmail}`);
  }
  
  let configLoaded = !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
  if (!configLoaded) {
    console.log('SMTP environment variables not found, trying to load from config file...');
    
    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          console.log(`Found config file at: ${configPath}`);
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);
          
          smtpConfig = {
            host: config.SMTP_HOST || smtpConfig.host,
            port: config.SMTP_PORT || smtpConfig.port,
            user: config.SMTP_USER || smtpConfig.user,
            pass: config.SMTP_PASS || smtpConfig.pass,
            fromEmail: config.FROM_EMAIL || smtpConfig.fromEmail,
            secure: config.SMTP_SECURE === 'true' || parseInt(config.SMTP_PORT) === 465 || smtpConfig.secure
          };
          
          // Ensure fromEmail has both username and domain parts
          if (smtpConfig.fromEmail.startsWith('@')) {
            smtpConfig.fromEmail = 'noreply' + smtpConfig.fromEmail;
            console.log(`⚠️ FROM_EMAIL in config was missing username part, using: ${smtpConfig.fromEmail}`);
          }
          
          configLoaded = !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
          
          if (configLoaded) {
            console.log('✅ SMTP configuration loaded successfully from file');
            break;
          }
        }
      } catch (err) {
        console.error('Error loading config file:', err);
      }
    }
  }
  
  if (!configLoaded) {
    console.error('❌ SMTP configuration is incomplete. Cannot send email.');
    console.error('Please set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables or provide a valid smtp-config.json file.');
    process.exit(1);
  }
  
  console.log(`📧 SMTP Configuration: ${smtpConfig.host}:${smtpConfig.port} (secure: ${smtpConfig.secure})`);
  console.log(`📧 From Email: ${smtpConfig.fromEmail}`);
  
  // Check for placeholder password
  const placeholders = [
    'replace-with-actual-password',
    'YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE',
    'your-password-here',
    'your-actual-password'
  ];
  
  if (placeholders.includes(smtpConfig.pass)) {
    console.error('❌ ERROR: SMTP password is still set to a placeholder value!');
    console.error(`Found placeholder: "${smtpConfig.pass}"`);
    console.error('Please update your SMTP configuration with a real password.');
    process.exit(1);
  }
  
  // Create test email transporter
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    },
    debug: true,
    logger: true
  });
  
  // Generate test ID and timestamp
  const testId = Math.random().toString(36).substring(2, 10);
  const timestamp = new Date().toISOString();
  
  // Email content
  const subject = `Verify Your Email for My Smart Scheduler`;
  const text = getEmailVerificationText(verifyLink);
  const html = getEmailVerificationHtml(verifyLink);
  
  try {
    console.log('📤 Attempting to send verification email...');
    
    // Verify connection first
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP connection verification failed:', verifyError.message);
      console.error('Cannot proceed with sending the test email.');
      process.exit(1);
    }
    
    // Send the test email
    const info = await transporter.sendMail({
      from: smtpConfig.fromEmail,
      to: recipient,
      subject,
      text,
      html
    });
    
    console.log('✅ Verification email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`Check your inbox at ${recipient} for the verification email.`);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    console.error('Error details:', error);
  }
}

main().catch(console.error);