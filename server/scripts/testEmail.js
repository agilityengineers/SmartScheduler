// Test Email Script
// Run with: node server/scripts/testEmail.js recipient@example.com

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const recipient = process.argv[2];
  
  if (!recipient) {
    console.error('Error: No recipient email provided');
    console.error('Usage: node server/scripts/testEmail.js recipient@example.com');
    process.exit(1);
  }
  
  console.log(`🔍 Testing email delivery to: ${recipient}`);
  
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
  const subject = `SmartScheduler Email Test [${testId}]`;
  const text = `This is a test email from your SmartScheduler application (ID: ${testId}).
Sent at: ${timestamp}
If you received this, email delivery is working correctly!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a86e8;">SmartScheduler Test Email</h2>
      <p>This is a test email from your SmartScheduler application.</p>
      <p><strong>Test ID:</strong> ${testId}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>If you received this:</strong> Email delivery is working correctly!</p>
      
      <p><strong>SMTP Configuration:</strong></p>
      <ul>
        <li>Host: ${smtpConfig.host}</li>
        <li>Port: ${smtpConfig.port}</li>
        <li>Secure: ${smtpConfig.secure ? 'Yes' : 'No'}</li>
        <li>From: ${smtpConfig.fromEmail}</li>
      </ul>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
        <p><strong>Troubleshooting Tips:</strong></p>
        <ul>
          <li>Check spam/junk folders</li>
          <li>Verify your SMTP server is properly configured</li>
          <li>Ensure your sending domain has proper DNS records (MX, SPF, DMARC)</li>
        </ul>
      </div>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated test message. Please do not reply.</p>
    </div>
  `;
  
  try {
    console.log('📤 Attempting to send test email...');
    
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
    
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`Check your inbox at ${recipient} for the test email.`);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('Error details:', error);
  }
}

main().catch(console.error);