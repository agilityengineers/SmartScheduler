import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load config from smtp-config.json
function loadSmtpConfig() {
  const configPath = path.join(process.cwd(), 'smtp-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.entries(configData).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
      console.log('SMTP config loaded from smtp-config.json');
    } catch (e) {
      console.error(`Error loading smtp-config.json: ${e.message}`);
    }
  } else {
    console.log('No smtp-config.json found, using environment variables');
  }
}

async function sendRealEmail(toEmail) {
  if (!toEmail) {
    console.error('Error: Email recipient is required');
    console.log('Usage: node test-real-email.js email@example.com');
    process.exit(1);
  }

  console.log('===== SENDING REAL EMAIL TEST =====');
  console.log(`Sending to: ${toEmail}`);
  
  // Load config
  loadSmtpConfig();
  
  // Log SMTP configuration
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'server.pushbutton-hosting.com');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '465');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'noreply@mysmartscheduler.co');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***set***' : '***not set***');
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE || 'true');
  
  // Create SMTP transport with timeout options
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'server.pushbutton-hosting.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER || 'noreply@mysmartscheduler.co',
      pass: process.env.SMTP_PASS || 'Success2025'
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 15000,     // 15 seconds
    debug: true
  });
  
  // First verify the connection
  console.log('Verifying SMTP connection...');
  try {
    const verifyResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SMTP verification timed out'));
      }, 15000);
      
      transporter.verify((error, success) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve(success);
        }
      });
    });
    
    console.log('SMTP verification successful:', verifyResult);
    
    // Send the email
    console.log(`Sending email to ${toEmail}...`);
    const emailResult = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co',
      to: toEmail,
      subject: 'Production Email Test - SmartScheduler',
      text: 'This is a test email sent from the SmartScheduler production environment to verify email functionality.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a6ee0;">SmartScheduler Email Test</h2>
          <p>This is a test email sent from the SmartScheduler production environment.</p>
          <p>If you're receiving this email, it means our email system is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', emailResult.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(emailResult));
    return emailResult;
  } catch (error) {
    console.error('Error sending email:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
    
    // Additional diagnostics for common errors
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication Error: The SMTP credentials were rejected.');
      console.error('Please check your username and password.');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      console.error('\nConnection Error: Could not establish a connection to the SMTP server.');
      console.error('This may be due to network restrictions or firewall settings.');
    } else if (error.code === 'EENVELOPE') {
      console.error('\nEnvelope Error: Problem with sender or recipient addresses.');
      console.error('Check that your email addresses are formatted correctly.');
    }
    
    throw error;
  }
}

// Get the email address from command line arguments
const recipientEmail = process.argv[2];
sendRealEmail(recipientEmail)
  .then(() => {
    console.log('Test email process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test email process failed with error:', error.message);
    process.exit(1);
  });