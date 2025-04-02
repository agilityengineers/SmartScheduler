/**
 * SMTP & SendGrid Email Configuration Diagnostic Tool
 * 
 * This script will test your SMTP and SendGrid configuration 
 * to identify issues with email delivery.
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';

// Get the current timestamp for unique test ID
const timestamp = Date.now();
const testEmailRecipient = process.argv[2] || 'test@example.com';

// Display test info
console.log(`
📧 EMAIL CONFIGURATION DIAGNOSTIC TOOL
=====================================
Test ID: ${timestamp}
Test Started: ${new Date().toISOString()}
Testing with: ${testEmailRecipient}
`);

// Check environment variables
console.log('📋 CHECKING ENVIRONMENT VARIABLES:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || '[not set]'}`);
console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || '[not set]'}`);
const fromEmail = normalizeFromEmail(process.env.FROM_EMAIL);
console.log(`- FROM_EMAIL (normalized): ${fromEmail}`);

// Check SMTP configuration
console.log('\n🔍 SMTP CONFIGURATION:');
console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || '[not set]'}`);
console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || '[not set]'}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER ? '[set]' : '[not set]'}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[set]' : '[not set]'}`);
console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || '[not set]'}`);

// Check SendGrid configuration
console.log('\n🔍 SENDGRID CONFIGURATION:');
console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? `[set, length: ${process.env.SENDGRID_API_KEY.length}]` : '[not set]'}`);

// Normalize FROM_EMAIL to handle @domain format
function normalizeFromEmail(email) {
  if (!email) return 'noreply@mysmartscheduler.co';
  if (email.startsWith('@')) return 'noreply' + email;
  return email;
}

// Test SMTP connection
async function testSmtpConnection() {
  console.log('\n🔌 TESTING SMTP CONNECTION:');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ Cannot test SMTP - missing required configuration');
    return;
  }
  
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true
  };
  
  console.log(`- Host: ${config.host}`);
  console.log(`- Port: ${config.port}`);
  console.log(`- Secure: ${config.secure}`);
  console.log(`- Username: ${config.auth.user}`);
  
  try {
    console.log('Connecting to SMTP server...');
    const transporter = nodemailer.createTransport(config);
    
    // Try to verify connection
    const verification = await transporter.verify();
    console.log('✅ SMTP Connection successful!');
    console.log('- Verification result:', verification);
    
    // Try to send a test email
    console.log(`\nSending test email to ${testEmailRecipient}...`);
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to: testEmailRecipient,
      subject: `SMTP Test [${timestamp}]`,
      text: `This is a test email sent from SMTP Configuration Diagnostic Tool at ${new Date().toISOString()}`,
      html: `<div style="font-family: Arial, sans-serif;">
        <h2>SMTP Test Email</h2>
        <p>This is a test email sent from SMTP Configuration Diagnostic Tool.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Server:</strong> ${config.host}</p>
      </div>`
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Response: ${info.response}`);
    
  } catch (error) {
    console.error('❌ SMTP Test failed with error:', error.message);
    
    if (error.code) {
      console.error(`- Error code: ${error.code}`);
    }
    
    if (error.command) {
      console.error(`- Failed command: ${error.command}`);
    }
    
    if (error.response) {
      console.error(`- Server response: ${error.response}`);
    }
    
    // Provide specific advice for common errors
    if (error.code === 'ECONNREFUSED') {
      console.error(`
ADVICE: Connection refused means the SMTP server at ${config.host}:${config.port} 
is not accepting connections. This could be due to:
- Incorrect hostname or IP address
- Incorrect port number
- Firewall blocking outbound connections to this port
- SMTP server is down or not running
      `);
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`
ADVICE: Connection timed out. This usually means:
- SMTP server is unreachable
- Network connectivity issues
- Firewall is blocking the connection
      `);
    } else if (error.code === 'EAUTH') {
      console.error(`
ADVICE: Authentication failed. This usually means:
- Incorrect username or password
- Account is locked or disabled
- Authentication method is not supported
      `);
    }
  }
}

// Test SendGrid API
async function testSendGridApi() {
  console.log('\n🔌 TESTING SENDGRID API:');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ Cannot test SendGrid - API key not configured');
    return;
  }
  
  // First test the API key permissions
  try {
    console.log('Checking SendGrid API key permissions...');
    
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SendGrid API key is valid');
      console.log(`- Key has ${data.scopes?.length || 0} permissions`);
      
      // Check for mail.send permission
      const canSendEmail = data.scopes?.includes('mail.send');
      console.log(`- Key has mail.send permission: ${canSendEmail ? 'YES ✅' : 'NO ❌'}`);
      
      if (!canSendEmail) {
        console.error(`
ADVICE: Your SendGrid API key lacks the 'mail.send' permission.
You need to generate a new API key with at least mail.send permission.
        `);
        return;
      }
    } else {
      console.error('❌ SendGrid API key is invalid or has expired');
      console.error(`- Status: ${response.status}`);
      try {
        const errorData = await response.json();
        console.error('- Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('- Error response:', await response.text());
      }
      return;
    }
    
    // Try sending a test email
    console.log(`\nSending test email to ${testEmailRecipient}...`);
    
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: testEmailRecipient }],
          subject: `SendGrid Test [${timestamp}]`
        }
      ],
      from: { email: fromEmail },
      content: [
        {
          type: 'text/plain',
          value: `This is a test email sent from SendGrid Configuration Diagnostic Tool at ${new Date().toISOString()}`
        },
        {
          type: 'text/html',
          value: `<div style="font-family: Arial, sans-serif;">
            <h2>SendGrid Test Email</h2>
            <p>This is a test email sent from SendGrid Configuration Diagnostic Tool.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>`
        }
      ],
      tracking_settings: {
        click_tracking: {
          enable: false
        },
        open_tracking: {
          enable: false
        }
      }
    };
    
    const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });
    
    if (sendResponse.ok) {
      console.log('✅ SendGrid test email sent successfully!');
      const messageId = sendResponse.headers.get('x-message-id');
      if (messageId) {
        console.log(`- Message ID: ${messageId}`);
      }
    } else {
      console.error('❌ SendGrid email sending failed');
      console.error(`- Status: ${sendResponse.status}`);
      
      try {
        const errorData = await sendResponse.json();
        console.error('- Error details:', JSON.stringify(errorData, null, 2));
        
        // Provide specific advice for common errors
        if (errorData.errors) {
          errorData.errors.forEach(err => {
            if (err.message?.includes('domain')) {
              console.error(`
ADVICE: Domain authentication issue detected. SendGrid requires domain authentication 
for your sender domain "${fromEmail.split('@')[1]}". You need to:
1. Verify your domain in the SendGrid dashboard
2. Ensure your domain has proper DKIM and SPF records
              `);
            }
          });
        }
      } catch (e) {
        console.error('- Error response:', await sendResponse.text());
      }
    }
    
  } catch (error) {
    console.error('❌ SendGrid API test failed with error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the tests
async function runTests() {
  try {
    await testSmtpConnection();
    await testSendGridApi();
    
    console.log('\n📝 DIAGNOSTIC SUMMARY:');
    console.log(`Diagnostic completed at ${new Date().toISOString()}`);
    console.log('Check your inbox for test emails to confirm delivery');
    console.log('If no emails are received, review the error messages above');
  } catch (error) {
    console.error('❌ Diagnostic failed with error:', error);
  }
}

runTests();