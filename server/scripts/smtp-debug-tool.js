/**
 * SMTP Debug Tool - For diagnosing email issues in production
 * 
 * This tool will:
 * 1. Log all environment variables related to email
 * 2. Test the SMTP connection
 * 3. Attempt to send a test email
 * 4. Provide detailed error logging
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect environment data
function collectEnvironmentData() {
  console.log('========== ENVIRONMENT DATA ==========');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL || 'not set'}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER || 'not set'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '[SET]' : '[NOT SET]'}`);
  console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'not set'}`);
  console.log(`REPLIT_OWNER: ${process.env.REPLIT_OWNER || 'not set'} (Indicates if running on Replit)`);
  console.log(`REPLIT_DB_URL: ${process.env.REPLIT_DB_URL ? '[SET]' : '[NOT SET]'} (Indicates Replit DB)`);
  console.log(`Current Working Directory: ${process.cwd()}`);
  
  // Check for smtp-config.json
  const configPath = path.join(process.cwd(), 'smtp-config.json');
  if (fs.existsSync(configPath)) {
    console.log(`smtp-config.json: EXISTS at ${configPath}`);
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      console.log('  Config contains:', Object.keys(config).join(', '));
    } catch (err) {
      console.log(`  Error reading config: ${err.message}`);
    }
  } else {
    console.log('smtp-config.json: MISSING');
  }
}

// Test SMTP connection
async function testSmtpConnection() {
  console.log('\n========== SMTP CONNECTION TEST ==========');
  
  // Check if we have all required environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === '465';
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('SMTP configuration missing:');
    if (!smtpHost) console.log('- SMTP_HOST is not set');
    if (!smtpUser) console.log('- SMTP_USER is not set');
    if (!smtpPass) console.log('- SMTP_PASS is not set');
    return false;
  }
  
  try {
    console.log(`Creating transport with host: ${smtpHost}, port: ${smtpPort}, secure: ${smtpSecure}`);
    console.log(`Using username: ${smtpUser}`);
    
    // Create a transport with debug enabled
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      debug: true, // Enable debug logs
      logger: true, // Log to console
      tls: {
        // Don't fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    console.log('Transport created, verifying connection...');
    
    // Verify connection
    const verifyResult = await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          reject(error);
        } else {
          resolve(success);
        }
      });
    });
    
    console.log(`Connection verified: ${verifyResult ? 'SUCCESS' : 'FAILED'}`);
    return { success: true, transporter };
  } catch (error) {
    console.log(`SMTP connection error: ${error.message}`);
    console.log(`Error code: ${error.code || 'none'}`);
    console.log(`Error response: ${error.response || 'none'}`);
    
    // Add specific error handling for AUTH errors
    if (error.responseCode === 535) {
      console.log('\n❌ AUTHENTICATION FAILED: The SMTP_PASS value is incorrect or rejected');
      console.log('Please verify your SMTP_PASS is correct. The current password might be:');
      console.log('- Expired or changed on the mail server');
      console.log('- Not correctly set in the environment variables');
      console.log('- Requires special characters that need proper escaping');
    }
    
    return { success: false, error };
  }
}

// Send a test email
async function sendTestEmail(to) {
  console.log(`\n========== SENDING TEST EMAIL TO ${to} ==========`);
  
  const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  
  const connectionResult = await testSmtpConnection();
  if (!connectionResult.success) {
    console.log('Cannot send test email - SMTP connection failed');
    return false;
  }
  
  try {
    const info = await connectionResult.transporter.sendMail({
      from: fromEmail,
      to,
      subject: `Test Email from Debug Tool - ${new Date().toISOString()}`,
      text: `This is a test email sent at ${new Date().toISOString()}\n\nFROM_EMAIL: ${fromEmail}\nSMTP_HOST: ${process.env.SMTP_HOST}\nSMTP_PORT: ${process.env.SMTP_PORT}\nSMTP_USER: ${process.env.SMTP_USER}\nSMTP_SECURE: ${process.env.SMTP_SECURE}\n\nThis email confirms that your SMTP settings are working correctly.`,
      html: `<h2>Email Test</h2><p>This is a test email sent at ${new Date().toISOString()}</p><h3>SMTP Configuration:</h3><ul><li>FROM_EMAIL: ${fromEmail}</li><li>SMTP_HOST: ${process.env.SMTP_HOST}</li><li>SMTP_PORT: ${process.env.SMTP_PORT}</li><li>SMTP_USER: ${process.env.SMTP_USER}</li><li>SMTP_SECURE: ${process.env.SMTP_SECURE}</li></ul><p>This email confirms that your SMTP settings are working correctly.</p>`
    });
    
    console.log('Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.log(`Failed to send email: ${error.message}`);
    console.log(`Error code: ${error.code || 'none'}`);
    console.log(`Error command: ${error.command || 'none'}`);
    
    // Additional troubleshooting for common errors
    if (error.message.includes('could not get a connection')) {
      console.log('\n❌ CONNECTION ISSUE: Could not establish SMTP connection');
      console.log('This might indicate:');
      console.log('- Network connectivity issues');
      console.log('- Replit outbound connections being blocked');
      console.log('- SMTP server is down or rejecting connections from Replit IP ranges');
    }
    
    if (error.message.includes('authenticate')) {
      console.log('\n❌ AUTHENTICATION ISSUE: Could not authenticate with SMTP server');
      console.log('Please verify:');
      console.log('- SMTP_USER is correct');
      console.log('- SMTP_PASS is correct');
      console.log('- The mail server accepts these credentials');
    }
    
    return false;
  }
}

// Run all tests
async function runDiagnostics() {
  const recipient = process.argv[2] || 'test@example.com';
  
  console.log('====================================================');
  console.log('SMTP DIAGNOSTIC TOOL');
  console.log('====================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Test recipient: ${recipient}`);
  
  // Check environment
  collectEnvironmentData();
  
  // Test connection
  await testSmtpConnection();
  
  // Send test email if recipient is provided
  if (recipient && recipient !== 'test@example.com') {
    await sendTestEmail(recipient);
  } else {
    console.log('\nℹ️ To send a test email, provide an email address as argument:');
    console.log('node server/scripts/smtp-debug-tool.js your-email@example.com');
  }
  
  console.log('\n====================================================');
  console.log('RECOMMENDATIONS:');
  
  if (!process.env.SMTP_PASS) {
    console.log('❌ CRITICAL: SMTP_PASS is not set! Email sending will fail.');
    console.log('   - For Replit: Add SMTP_PASS in the Secrets tab');
    console.log('   - Value should be: Success2025 (the previously working password)');
  }
  
  if (process.env.REPLIT_OWNER) {
    console.log('\nReplit Environment Detected');
    console.log('- Ensure all environment variables are set in Replit Secrets');
    console.log('- Make sure to click "Apply" after adding secrets');
    console.log('- Restart your repl to apply changes');
  }
  
  console.log('\nCommon fixes:');
  console.log('1. Check SMTP_PASS (password might be outdated or incorrect)');
  console.log('2. Verify your hosting provider allows outbound SMTP connections');
  console.log('3. Confirm that the SMTP server accepts connections from your server\'s IP');
  console.log('====================================================');
}

// Run diagnostics
runDiagnostics().catch(console.error);