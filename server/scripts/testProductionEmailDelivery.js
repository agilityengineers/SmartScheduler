// Script to test email delivery in production environment
// with enhanced debugging and diagnostics
require('dotenv').config();

// Create test email recipients
const testEmailRecipient = process.argv[2] || 'test@example.com';
const timestamp = Date.now();
const testSubject = `Production Test Email [${timestamp}]`;

console.log(`
🧪 TESTING PRODUCTION EMAIL DELIVERY
====================================
Environment: ${process.env.NODE_ENV || 'development'}
Test Email Recipient: ${testEmailRecipient}
Test Timestamp: ${timestamp}
Test Subject: ${testSubject}
`);

// Print environment configuration
console.log('📋 ENVIRONMENT CONFIGURATION:');
console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || '[not set]'}`);
console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || '[not set]'}`);
console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || '[not set]'}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER ? '[set]' : '[not set]'}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[set]' : '[not set]'}`);
console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || '[not set]'}`);
console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? `[set, length: ${process.env.SENDGRID_API_KEY.length}]` : '[not set]'}`);

// Function to normalize email address
function normalizeFromEmail(email) {
  if (!email) return 'noreply@mysmartscheduler.co';
  if (email.startsWith('@')) return 'noreply' + email;
  return email;
}

// Configure email content
const fromEmail = normalizeFromEmail(process.env.FROM_EMAIL);
console.log(`\n📧 Normalized FROM_EMAIL: ${fromEmail}`);

// Test SMTP configuration directly using nodemailer
async function testSmtp() {
  console.log('\n📨 TESTING SMTP DELIVERY:');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ SMTP not configured - missing required credentials');
    return false;
  }
  
  const nodemailer = require('nodemailer');
  
  // Create SMTP transport
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Enable verbose logging
    logger: true  // Log to console
  };
  
  console.log('SMTP Configuration:');
  console.log(`- Host: ${smtpConfig.host}`);
  console.log(`- Port: ${smtpConfig.port}`);
  console.log(`- Secure: ${smtpConfig.secure}`);
  console.log(`- Auth User: ${smtpConfig.auth.user}`);
  
  try {
    console.log('Creating SMTP transport...');
    const transporter = nodemailer.createTransport(smtpConfig);
    
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    console.log(`Sending test email to ${testEmailRecipient}...`);
    const result = await transporter.sendMail({
      from: fromEmail,
      to: testEmailRecipient,
      subject: `${testSubject} - SMTP`,
      text: `This is a test email sent via SMTP at ${new Date().toISOString()}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #0066cc;">SMTP Test Email</h2>
        <p>This is a test email sent via SMTP to verify email delivery functionality.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <p>If you're seeing this message, SMTP delivery is working correctly!</p>
      </div>`
    });
    
    console.log('✅ SMTP test email sent successfully');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- Response: ${JSON.stringify(result.response)}`);
    return true;
  } catch (error) {
    console.error('❌ SMTP test failed with error:', error.message);
    if (error.code) console.error(`- Error code: ${error.code}`);
    if (error.response) console.error(`- SMTP response: ${error.response}`);
    return false;
  }
}

// Test SendGrid configuration directly
async function testSendGrid() {
  console.log('\n📨 TESTING SENDGRID DELIVERY:');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SendGrid not configured - missing API key');
    return false;
  }
  
  // Prepare the SendGrid API payload according to v3 API format
  const payload = {
    personalizations: [
      {
        to: [{ email: testEmailRecipient }],
        subject: `${testSubject} - SendGrid`
      }
    ],
    from: { email: fromEmail },
    content: [
      {
        type: 'text/plain',
        value: `This is a test email sent via SendGrid at ${new Date().toISOString()}`
      },
      {
        type: 'text/html',
        value: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #0066cc;">SendGrid Test Email</h2>
          <p>This is a test email sent via SendGrid to verify email delivery functionality.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p>If you're seeing this message, SendGrid delivery is working correctly!</p>
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
    console.log(`- API Key Length: ${process.env.SENDGRID_API_KEY.length}`);
    console.log(`- From Email: ${fromEmail}`);
    
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
      } catch (e) {
        const textResponse = await response.text();
        console.error('- Error response text:', textResponse);
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ SendGrid test failed with error:', error.message);
    if (error.stack) console.error('- Stack trace:', error.stack);
    return false;
  }
}

// Execute tests
async function runTests() {
  console.log('\n🔍 STARTING EMAIL DELIVERY TESTS\n');
  
  try {
    // Test SMTP first
    const smtpResult = await testSmtp();
    
    // Test SendGrid second
    const sendgridResult = await testSendGrid();
    
    // Report overall results
    console.log('\n📊 TEST RESULTS:');
    console.log(`- SMTP delivery: ${smtpResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`- SendGrid delivery: ${sendgridResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (smtpResult || sendgridResult) {
      console.log('\n✅ OVERALL: At least one delivery method worked successfully');
      console.log(`Check the inbox of ${testEmailRecipient} for test emails`);
    } else {
      console.log('\n❌ OVERALL: All delivery methods failed');
      console.log('Review error messages above and check environment configuration');
    }
  } catch (error) {
    console.error('\n❌ TEST EXECUTION ERROR:', error);
  }
}

// Run the tests
runTests();