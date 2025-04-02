/**
 * PRODUCTION EMAIL DIAGNOSTIC TOOL
 * 
 * This tool provides comprehensive diagnostics for email delivery issues in production.
 * It tests various aspects of the email delivery system and provides detailed logs
 * to help identify the specific causes of email delivery failures.
 * 
 * Usage: node productionEmailDiagnostic.js [recipient@example.com]
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import util from 'util';
import { execSync } from 'child_process';

// Create a log file that captures all console output
const logFile = `email-diagnostic-${Date.now()}.log`;
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Override console methods to also write to the log file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const logString = util.format(...args);
  logStream.write(logString + '\n');
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const logString = util.format(...args);
  logStream.write('[ERROR] ' + logString + '\n');
  originalConsoleError.apply(console, args);
};

// Parse command line arguments
const testEmailRecipient = process.argv[2] || 'test@example.com';
const timestamp = Date.now();
const testSubject = `Production Diagnostic [${timestamp}]`;

console.log(`
🔍 PRODUCTION EMAIL DIAGNOSTIC TOOL
===================================
Started: ${new Date().toISOString()}
Log File: ${logFile}
Environment: ${process.env.NODE_ENV || 'development'}
Test Email: ${testEmailRecipient}
`);

// 1. Environment Analysis
console.log('\n📋 ENVIRONMENT ANALYSIS:');
console.log('Environment Variables:');

// System environment variables
console.log(`- NODE_ENV: ${process.env.NODE_ENV || '[not set]'}`);
console.log(`- HOSTNAME: ${process.env.HOSTNAME || '[not set]'}`);
console.log(`- BASE_URL: ${process.env.BASE_URL || '[not set]'}`);
console.log(`- REPL_ID: ${process.env.REPL_ID || '[not set]'}`);
console.log(`- REPL_SLUG: ${process.env.REPL_SLUG || '[not set]'}`);
console.log(`- REPL_OWNER: ${process.env.REPL_OWNER || '[not set]'}`);

// Email configuration variables
console.log('\nEmail Configuration:');
console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || '[not set]'}`);
console.log(`- FROM_EMAIL (normalized): ${normalizeEmail(process.env.FROM_EMAIL)}`);

// SMTP configuration
console.log('\nSMTP Configuration:');
console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || '[not set]'}`);
console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || '[not set]'}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER ? '[set]' : '[not set]'}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[set]' : '[not set]'}`);
console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || '[not set]'}`);

// SendGrid configuration
console.log('\nSendGrid Configuration:');
console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? `[set, length: ${process.env.SENDGRID_API_KEY.length}]` : '[not set]'}`);

// 2. Network Connectivity Tests
console.log('\n🌐 NETWORK CONNECTIVITY TESTS:');

async function testSmtpConnectivity() {
  if (!process.env.SMTP_HOST) {
    console.log('❌ SMTP_HOST not set, skipping SMTP connectivity test');
    return false;
  }
  
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  
  console.log(`Testing connectivity to SMTP server: ${host}:${port}`);
  
  try {
    // Use system tools to check connectivity
    const testCommand = `nc -zv ${host} ${port} -w 5 2>&1 || echo "Connection failed"`;
    const result = execSync(testCommand).toString();
    
    console.log('SMTP connectivity test result:');
    console.log(result);
    
    if (result.includes('succeeded') || result.includes('open')) {
      console.log(`✅ SMTP connectivity test: CONNECTION SUCCESSFUL to ${host}:${port}`);
      return true;
    } else {
      console.error(`❌ SMTP connectivity test: CONNECTION FAILED to ${host}:${port}`);
      return false;
    }
  } catch (error) {
    console.error('❌ SMTP connectivity test error:', error.message);
    return false;
  }
}

async function testSendGridConnectivity() {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set, skipping SendGrid connectivity test');
    return false;
  }
  
  console.log('Testing connectivity to SendGrid API');
  
  try {
    console.log('Sending request to SendGrid API (GET /scopes)...');
    
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SendGrid API connectivity test: CONNECTION SUCCESSFUL (Status: ${response.status})`);
      console.log(`- API Key has ${data.scopes?.length || 0} permissions`);
      
      // Check for mail.send permission
      const canSendEmail = data.scopes?.includes('mail.send');
      console.log(`- API Key has mail.send permission: ${canSendEmail ? 'YES' : 'NO'}`);
      
      return true;
    } else {
      console.error(`❌ SendGrid API connectivity test: CONNECTION FAILED (Status: ${response.status})`);
      
      try {
        const errorData = await response.json();
        console.error('- Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('- Response text:', await response.text());
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ SendGrid API connectivity test error:', error.message);
    return false;
  }
}

// 3. SMTP Authentication Test
async function testSmtpAuth() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ SMTP credentials incomplete, skipping SMTP authentication test');
    return false;
  }
  
  console.log('\n🔐 SMTP AUTHENTICATION TEST:');
  
  // Create SMTP transport for testing authentication
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true
  };
  
  console.log('SMTP Configuration:');
  console.log(`- Host: ${smtpConfig.host}`);
  console.log(`- Port: ${smtpConfig.port}`);
  console.log(`- Secure: ${smtpConfig.secure}`);
  console.log(`- Auth User: ${smtpConfig.auth.user}`);
  
  try {
    console.log('Creating SMTP transport...');
    const transporter = nodemailer.createTransport(smtpConfig);
    
    console.log('Verifying SMTP connection and authentication...');
    await transporter.verify();
    console.log('✅ SMTP authentication successful - credentials are valid');
    return true;
  } catch (error) {
    console.error('❌ SMTP authentication failed:', error.message);
    if (error.code) console.error(`- Error code: ${error.code}`);
    if (error.response) console.error(`- SMTP response: ${error.response}`);
    return false;
  }
}

// 4. DNS and MX Record Tests
async function testDnsResolution() {
  console.log('\n📡 DNS RESOLUTION TESTS:');
  
  // Extract domains from configuration
  const domains = [];
  
  // Add SMTP domain
  if (process.env.SMTP_HOST) {
    domains.push(process.env.SMTP_HOST);
  }
  
  // Add sender domain
  if (process.env.FROM_EMAIL) {
    const normalizedEmail = normalizeEmail(process.env.FROM_EMAIL);
    const domain = normalizedEmail.split('@')[1];
    if (domain && !domains.includes(domain)) {
      domains.push(domain);
    }
  }
  
  // Add recipient domain
  if (testEmailRecipient) {
    const domain = testEmailRecipient.split('@')[1];
    if (domain && !domains.includes(domain)) {
      domains.push(domain);
    }
  }
  
  // Add SendGrid domains
  domains.push('api.sendgrid.com');
  
  console.log(`Testing DNS resolution for ${domains.length} domains:`);
  
  for (const domain of domains) {
    try {
      console.log(`\nResolving DNS for ${domain}...`);
      
      // Use system tools to resolve DNS
      const dnsCommand = `dig ${domain} +short || nslookup ${domain} 2>&1`;
      const result = execSync(dnsCommand).toString();
      
      console.log(`DNS resolution for ${domain}:`);
      console.log(result || 'No records found');
      
      if (result.trim()) {
        console.log(`✅ DNS resolution successful for ${domain}`);
      } else {
        console.error(`❌ DNS resolution failed for ${domain}`);
      }
      
      // Check MX records for email domains
      if (domain.includes('.') && !domain.includes('api.')) {
        console.log(`Checking MX records for ${domain}...`);
        const mxCommand = `dig ${domain} MX +short || nslookup -type=MX ${domain} 2>&1`;
        const mxResult = execSync(mxCommand).toString();
        
        console.log(`MX records for ${domain}:`);
        console.log(mxResult || 'No MX records found');
        
        if (mxResult.trim()) {
          console.log(`✅ MX records found for ${domain}`);
        } else {
          console.log(`⚠️ No MX records found for ${domain}`);
        }
      }
    } catch (error) {
      console.error(`❌ DNS test error for ${domain}:`, error.message);
    }
  }
}

// 5. Email Delivery Tests
async function testSmtpDelivery() {
  console.log('\n📨 SMTP DELIVERY TEST:');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ SMTP not configured - missing required credentials');
    return false;
  }
  
  // Create SMTP transport
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true
  };
  
  try {
    console.log('Creating SMTP transport...');
    const transporter = nodemailer.createTransport(smtpConfig);
    
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    
    console.log(`Sending test email via SMTP to ${testEmailRecipient}...`);
    const normalizedFromEmail = normalizeEmail(process.env.FROM_EMAIL);
    
    const result = await transporter.sendMail({
      from: normalizedFromEmail,
      to: testEmailRecipient,
      subject: `${testSubject} - SMTP`,
      text: `This is a test email sent via SMTP at ${new Date().toISOString()}\n\nDiagnostic Info:\n- Host: ${smtpConfig.host}\n- From: ${normalizedFromEmail}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0066cc;">SMTP Test Email</h2>
        <p>This is a test email sent via SMTP to verify email delivery functionality.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <p><strong>Server:</strong> ${process.env.HOSTNAME || 'unknown'}</p>
        <p>If you're seeing this message, SMTP delivery is working correctly!</p>
        <hr>
        <h3>Diagnostic Information:</h3>
        <ul>
          <li><strong>SMTP Host:</strong> ${smtpConfig.host}</li>
          <li><strong>From Email:</strong> ${normalizedFromEmail}</li>
          <li><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'development'}</li>
        </ul>
      </div>`
    });
    
    console.log('✅ SMTP test email sent successfully');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- Response: ${JSON.stringify(result.response)}`);
    return true;
  } catch (error) {
    console.error('❌ SMTP delivery test failed with error:', error.message);
    if (error.code) console.error(`- Error code: ${error.code}`);
    if (error.response) console.error(`- SMTP response: ${error.response}`);
    if (error.command) console.error(`- Failed at command: ${error.command}`);
    
    // Special handling for EENVELOPE errors (recipient rejection)
    if (error.code === 'EENVELOPE') {
      console.error(`
⚠️ RECIPIENT REJECTION DETECTED:
The SMTP server rejected the recipient address "${testEmailRecipient}".
This often happens when:
1. The recipient domain doesn't exist
2. The recipient address is invalid
3. The recipient domain has blocked your SMTP server
4. Your SMTP provider requires recipient verification

Try sending to a different, confirmed valid email address.
      `);
    }
    
    // Special handling for authentication errors
    if (error.code === 'EAUTH') {
      console.error(`
⚠️ AUTHENTICATION ERROR DETECTED:
The SMTP server rejected your authentication credentials.
This could happen when:
1. Username or password is incorrect
2. Your account is locked or restricted
3. The server requires a different authentication method
4. Your IP address is blocked by the SMTP server

Verify your SMTP_USER and SMTP_PASS environment variables.
      `);
    }
    
    return false;
  }
}

async function testSendGridDelivery() {
  console.log('\n📨 SENDGRID DELIVERY TEST:');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SendGrid not configured - missing API key');
    return false;
  }
  
  // Prepare the SendGrid API payload
  const normalizedFromEmail = normalizeEmail(process.env.FROM_EMAIL);
  
  const payload = {
    personalizations: [
      {
        to: [{ email: testEmailRecipient }],
        subject: `${testSubject} - SendGrid`
      }
    ],
    from: { email: normalizedFromEmail },
    content: [
      {
        type: 'text/plain',
        value: `This is a test email sent via SendGrid at ${new Date().toISOString()}\n\nDiagnostic Info:\n- From: ${normalizedFromEmail}\n- Environment: ${process.env.NODE_ENV || 'development'}`
      },
      {
        type: 'text/html',
        value: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #0066cc;">SendGrid Test Email</h2>
          <p>This is a test email sent via SendGrid to verify email delivery functionality.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Server:</strong> ${process.env.HOSTNAME || 'unknown'}</p>
          <p>If you're seeing this message, SendGrid delivery is working correctly!</p>
          <hr>
          <h3>Diagnostic Information:</h3>
          <ul>
            <li><strong>From Email:</strong> ${normalizedFromEmail}</li>
            <li><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'development'}</li>
            <li><strong>API Key Length:</strong> ${process.env.SENDGRID_API_KEY.length}</li>
          </ul>
        </div>`
      }
    ],
    // Disable click tracking to prevent link modification
    tracking_settings: {
      click_tracking: {
        enable: false,
        enable_text: false
      },
      open_tracking: {
        enable: false
      }
    }
  };
  
  try {
    console.log('Sending request to SendGrid API...');
    console.log(`- Using sender email: ${normalizedFromEmail}`);
    
    // Send the request using fetch API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ SendGrid test email accepted (Status: ${response.status})`);
      const messageId = response.headers.get('x-message-id');
      if (messageId) {
        console.log(`- Message ID: ${messageId}`);
      } else {
        console.log('⚠️ No message ID returned in headers');
      }
      return true;
    } else {
      console.error(`❌ SendGrid API returned error status: ${response.status}`);
      
      // Try to parse the error response
      let errorData;
      try {
        errorData = await response.json();
        console.error('- Error details:', JSON.stringify(errorData, null, 2));
        
        // Specific error handling for common issues
        if (errorData.errors) {
          errorData.errors.forEach((err, index) => {
            console.error(`Error #${index + 1}:`, err.message);
            
            if (err.message?.includes('domain')) {
              console.error(`
⚠️ DOMAIN AUTHENTICATION ISSUE DETECTED:
SendGrid requires domain authentication for your sender domain "${normalizedFromEmail.split('@')[1]}".
You need to verify your domain in the SendGrid dashboard to improve deliverability.
              `);
            }
            
            if (err.message?.includes('permission') || err.message?.includes('scope')) {
              console.error(`
⚠️ API KEY PERMISSION ISSUE DETECTED:
Your SendGrid API key does not have the required 'mail.send' permission.
Generate a new API key with full access or ensure mail.send permission is enabled.
              `);
            }
          });
        }
      } catch (e) {
        const textResponse = await response.text();
        console.error('- Error response text:', textResponse);
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ SendGrid delivery test failed with error:', error.message);
    console.error('- Stack trace:', error.stack);
    return false;
  }
}

// Utility function to normalize email address
function normalizeEmail(email) {
  if (!email) return 'noreply@mysmartscheduler.co';
  if (email.startsWith('@')) return 'noreply' + email;
  return email;
}

// Run all tests
async function runAllTests() {
  console.log('\n🔍 STARTING COMPREHENSIVE EMAIL DIAGNOSTICS\n');
  
  try {
    // 1. Check for connectivity to SMTP server
    await testSmtpConnectivity();
    
    // 2. Check for connectivity to SendGrid API
    await testSendGridConnectivity();
    
    // 3. Perform DNS resolution tests
    await testDnsResolution();
    
    // 4. Test SMTP authentication
    await testSmtpAuth();
    
    // 5. Test email delivery
    const smtpDeliveryResult = await testSmtpDelivery();
    const sendgridDeliveryResult = await testSendGridDelivery();
    
    // 6. Final report
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log(`- SMTP Delivery Test: ${smtpDeliveryResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`- SendGrid Delivery Test: ${sendgridDeliveryResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (smtpDeliveryResult || sendgridDeliveryResult) {
      console.log('\n✅ OVERALL RESULT: At least one delivery method is working');
      console.log(`Check the inbox of ${testEmailRecipient} for test emails`);
    } else {
      console.log('\n❌ OVERALL RESULT: All delivery methods failed');
      console.log('Review the diagnostic information above for specific issues');
    }
    
    console.log(`\nDiagnostic log has been saved to: ${logFile}`);
    console.log('Send this log file to your development team for further analysis');
    
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC EXECUTION ERROR:', error);
  } finally {
    // Close log file
    logStream.end();
  }
}

// Start the diagnostic process
runAllTests();