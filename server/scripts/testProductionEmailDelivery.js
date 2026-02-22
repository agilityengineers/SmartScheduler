/**
 * Production Email Configuration Test
 * 
 * This script tests the production email configuration and documents any issues found.
 * It bypasses all fallback mechanisms and tests ONLY the production-configured SMTP server.
 * 
 * Usage: node server/scripts/testProductionEmailDelivery.js recipient@example.com
 */

import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';
import tls from 'tls';
import fs from 'fs';

// Default configuration for production
const PRODUCTION_CONFIG = {
  FROM_EMAIL: 'noreply@smart-scheduler.ai',
  SMTP_HOST: 'server.pushbutton-hosting.com',
  SMTP_PORT: 465,
  SMTP_USER: 'noreply@smart-scheduler.ai',
  SMTP_SECURE: true
};

// Get the recipient email from command line arguments
const toEmail = process.argv[2];

if (!toEmail) {
  console.error('❌ No recipient email provided');
  console.error('Usage: node testProductionEmailDelivery.js recipient@example.com');
  process.exit(1);
}

// Log header
console.log('========================================================');
console.log('📧 PRODUCTION EMAIL DELIVERY TEST');
console.log(`🕒 ${new Date().toISOString()}`);
console.log('========================================================');

// Check for SMTP password - it's essential for testing
if (!process.env.SMTP_PASS) {
  console.error('\n❌ SMTP_PASS environment variable is not set!');
  console.error('This test requires the SMTP password to be set in the environment.');
  console.error('Please run again with:');
  console.error('  SMTP_PASS=your_actual_password node server/scripts/testProductionEmailDelivery.js recipient@example.com');
  process.exit(1);
}

// Main test function
async function testProductionEmail() {
  console.log('\n📋 TEST ENVIRONMENT:');
  console.log(`- Node.js: ${process.version}`);
  console.log(`- Platform: ${process.platform}`);
  console.log(`- PID: ${process.pid}`);
  console.log(`- Testing email delivery to: ${toEmail}`);
  
  console.log('\n📋 PRODUCTION EMAIL CONFIGURATION:');
  console.log(`- FROM_EMAIL: ${PRODUCTION_CONFIG.FROM_EMAIL}`);
  console.log(`- SMTP_HOST: ${PRODUCTION_CONFIG.SMTP_HOST}`);
  console.log(`- SMTP_PORT: ${PRODUCTION_CONFIG.SMTP_PORT}`);
  console.log(`- SMTP_USER: ${PRODUCTION_CONFIG.SMTP_USER}`);
  console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[Set]' : '[Not Set]'}`);
  console.log(`- SMTP_SECURE: ${PRODUCTION_CONFIG.SMTP_SECURE}`);
  
  // 1. DNS Resolution Test
  console.log('\n🔄 Step 1: Testing DNS Resolution...');
  try {
    const addresses = await dns.promises.resolve(PRODUCTION_CONFIG.SMTP_HOST);
    console.log(`✅ DNS Resolution Successful: ${PRODUCTION_CONFIG.SMTP_HOST} resolves to:`, addresses);
  } catch (error) {
    console.error(`❌ DNS Resolution Failed: ${error.message}`);
    console.error('This indicates a DNS issue - the email server cannot be found.');
    console.error('Possible causes:');
    console.error('- The SMTP_HOST value is incorrect');
    console.error('- There is a DNS issue in your network');
    console.error('- The mail server is down or unreachable');
    return false;
  }
  
  // 2. TCP Connection Test
  console.log('\n🔄 Step 2: Testing TCP Connection...');
  try {
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({
        host: PRODUCTION_CONFIG.SMTP_HOST,
        port: PRODUCTION_CONFIG.SMTP_PORT,
        timeout: 5000
      });
      
      socket.on('connect', () => {
        console.log(`✅ TCP Connection Successful to ${PRODUCTION_CONFIG.SMTP_HOST}:${PRODUCTION_CONFIG.SMTP_PORT}`);
        socket.end();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error(`❌ TCP Connection Failed: ${error.message}`);
    console.error('This indicates a connectivity issue with the SMTP server.');
    console.error('Possible causes:');
    console.error('- The SMTP_PORT value is incorrect');
    console.error('- The server is not accepting connections on that port');
    console.error('- A firewall is blocking the connection');
    console.error('- The mail server is down');
    return false;
  }
  
  // 3. TLS/SSL Connection Test (for secure connections)
  if (PRODUCTION_CONFIG.SMTP_SECURE) {
    console.log('\n🔄 Step 3: Testing TLS/SSL Connection...');
    try {
      await new Promise((resolve, reject) => {
        const socket = tls.connect({
          host: PRODUCTION_CONFIG.SMTP_HOST,
          port: PRODUCTION_CONFIG.SMTP_PORT,
          timeout: 5000,
          rejectUnauthorized: false
        });
        
        socket.on('secureConnect', () => {
          console.log(`✅ SSL/TLS Connection Successful`);
          if (socket.authorized) {
            console.log('- Certificate is valid');
          } else {
            console.log(`- Certificate validation failed: ${socket.authorizationError}`);
            console.log('  (This may not prevent email delivery but could affect security)');
          }
          socket.end();
          resolve();
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('SSL connection timeout'));
        });
        
        socket.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.error(`❌ SSL/TLS Connection Failed: ${error.message}`);
      console.error('This indicates an issue with the secure connection.');
      console.error('Possible causes:');
      console.error('- The SMTP_SECURE setting is incorrect');
      console.error('- The server does not support SSL/TLS on this port');
      console.error('- There is an SSL certificate issue on the server');
      console.error('- A security policy or firewall is blocking SSL connections');
      return false;
    }
  }
  
  // 4. SMTP Authentication Test
  console.log('\n🔄 Step 4: Testing SMTP Authentication...');
  let transporter;
  try {
    // Create transporter with detailed logging
    transporter = nodemailer.createTransport({
      host: PRODUCTION_CONFIG.SMTP_HOST,
      port: PRODUCTION_CONFIG.SMTP_PORT,
      secure: PRODUCTION_CONFIG.SMTP_SECURE,
      auth: {
        user: PRODUCTION_CONFIG.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      debug: true, // Enable debug output
      logger: true, // Log information about the mail
      tls: {
        rejectUnauthorized: false // Don't reject invalid certs
      }
    });
    
    // Verify connection configuration
    await transporter.verify();
    console.log('✅ SMTP Authentication Successful');
  } catch (error) {
    console.error(`❌ SMTP Authentication Failed: ${error.message}`);
    console.error('This indicates an issue with the SMTP credentials or configuration.');
    console.error('Possible causes:');
    console.error('- Incorrect SMTP_USER or SMTP_PASS');
    console.error('- The server does not accept authentication');
    console.error('- The account is locked or has restrictions');
    
    // Extra diagnostic information for authentication errors
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Error Details:');
      console.error('- Check SMTP_USER and SMTP_PASS are correct');
      console.error('- Try manual testing with a mail client using the same credentials');
      console.error('- Check if this email account has sending permissions');
    }
    
    return false;
  }
  
  // 5. Send Test Email
  console.log('\n🔄 Step 5: Sending Test Email...');
  try {
    // Generate a unique test ID
    const testId = Math.random().toString(36).substring(2, 8);
    
    // Send email with detailed diagnostic information
    const info = await transporter.sendMail({
      from: `"Scheduler Diagnostics" <${PRODUCTION_CONFIG.FROM_EMAIL}>`,
      to: toEmail,
      subject: `Production Email Test [${testId}]`,
      text: `This is a test email sent from the production environment.
      
Test ID: ${testId}
Time: ${new Date().toISOString()}
Server: ${PRODUCTION_CONFIG.SMTP_HOST}:${PRODUCTION_CONFIG.SMTP_PORT}

If you received this email, it confirms the production email delivery system is working correctly.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a86e8;">Production Email Test</h2>
          <p>This is a test email sent from the production environment.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Test ID:</strong> ${testId}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Server:</strong> ${PRODUCTION_CONFIG.SMTP_HOST}:${PRODUCTION_CONFIG.SMTP_PORT}</p>
            <p><strong>From:</strong> ${PRODUCTION_CONFIG.FROM_EMAIL}</p>
          </div>
          
          <p>If you received this email, it confirms the production email delivery system is working correctly.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">
            This is an automated diagnostic email. Please do not reply.
          </p>
        </div>
      `
    });
    
    console.log('✅ Email Sent Successfully!');
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Recipient: ${toEmail}`);
    console.log(`- Test ID: ${testId}`);
    
    // 6. Generate Report
    console.log('\n📝 GENERATING DIAGNOSTIC REPORT...');
    
    const report = `
========================================================
📧 PRODUCTION EMAIL DELIVERY DIAGNOSTIC REPORT
🕒 ${new Date().toISOString()}
========================================================

✅ TEST SUMMARY: All tests PASSED

📋 SERVER INFORMATION:
- Node.js: ${process.version}
- Platform: ${process.platform}
- Test Email Recipient: ${toEmail}

📋 EMAIL CONFIGURATION:
- FROM_EMAIL: ${PRODUCTION_CONFIG.FROM_EMAIL}
- SMTP_HOST: ${PRODUCTION_CONFIG.SMTP_HOST}
- SMTP_PORT: ${PRODUCTION_CONFIG.SMTP_PORT}
- SMTP_USER: ${PRODUCTION_CONFIG.SMTP_USER}
- SMTP_SECURE: ${PRODUCTION_CONFIG.SMTP_SECURE}

📋 TEST RESULTS:
✅ DNS Resolution: Success
✅ TCP Connection: Success
✅ SSL/TLS Connection: Success
✅ SMTP Authentication: Success
✅ Email Delivery: Success

📋 EMAIL DETAILS:
- Message ID: ${info.messageId}
- Recipient: ${toEmail}
- Test ID: ${testId}
- Sent At: ${new Date().toISOString()}

📋 NEXT STEPS:
- Verify the test email was received by ${toEmail}
- Check spam/junk folders if not found in inbox
- If email was received, email delivery is configured correctly

========================================================
`;
    
    // Save the report to a file
    fs.writeFileSync('production-email-diagnostics.log', report);
    console.log('📝 Diagnostic report saved to production-email-diagnostics.log');
    
    return true;
  } catch (error) {
    console.error(`❌ Email Sending Failed: ${error.message}`);
    console.error('This indicates an issue with the email sending process.');
    console.error('Possible causes:');
    console.error('- There is a rate limit or sending quota issue');
    console.error('- The recipient address is invalid or being rejected');
    console.error('- The sender email domain has SPF/DKIM/DMARC issues');
    console.error('- The email content is being flagged as spam');
    
    // Extra diagnostic information for specific errors
    if (error.code === 'EENVELOPE') {
      console.error('\n💡 Recipient Envelope Error:');
      console.error('- The recipient address may be invalid or rejected by the server');
      console.error('- Check if there are restrictions on allowed recipient domains');
    }
    
    if (error.responseCode) {
      console.error(`\n💡 SMTP Response Code: ${error.responseCode}`);
      console.error(`SMTP Response: ${error.response}`);
    }
    
    return false;
  }
}

// Run the test
testProductionEmail()
  .then(success => {
    if (success) {
      console.log('\n✅ PRODUCTION EMAIL TEST: ALL TESTS PASSED');
      console.log(`Email was successfully sent to ${toEmail}`);
      console.log('Check that mailbox to confirm delivery.');
      process.exit(0);
    } else {
      console.error('\n❌ PRODUCTION EMAIL TEST: SOME TESTS FAILED');
      console.error('See above for detailed error information.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ UNEXPECTED ERROR:', error);
    process.exit(1);
  });