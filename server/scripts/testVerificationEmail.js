// Test Verification Email with Updated Configuration
// Tests sending a verification email using noreply@mysmartscheduler.co
import nodemailer from 'nodemailer';

// Create simple email templates for testing
function getEmailVerificationHtml(verifyLink) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4a86e8;">Verify Your Email Address</h2>
      <p>Thank you for signing up for Smart Scheduler. Please click the button below to verify your email address:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #4a86e8; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify My Email
        </a>
      </p>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #666;">${verifyLink}</p>
      <p>This verification link will expire in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #888;">
        This email was sent to verify your account. If you didn't sign up for Smart Scheduler, you can safely ignore this email.
      </p>
    </div>
  `;
}

function getEmailVerificationText(verifyLink) {
  return `
    Verify Your Email Address
    
    Thank you for signing up for Smart Scheduler. Please visit the link below to verify your email address:
    
    ${verifyLink}
    
    This verification link will expire in 24 hours.
    
    If you didn't sign up for Smart Scheduler, you can safely ignore this email.
  `;
}

async function testVerificationEmail() {
  console.log('🔍 VERIFICATION EMAIL TEST');
  console.log('========================');
  
  // Updated configuration
  const smtpHost = 'server.pushbutton-hosting.com';
  const smtpPort = 465;
  const smtpUser = 'noreply@mysmartscheduler.co';
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = true;
  const fromEmail = 'noreply@mysmartscheduler.co';
  
  // Show current configuration
  console.log('\nTest Configuration:');
  console.log(`- SMTP_HOST: ${smtpHost || 'not set'}`);
  console.log(`- SMTP_PORT: ${smtpPort}`);
  console.log(`- SMTP_USER: ${smtpUser || 'not set'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? 'set (hidden)' : 'not set'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  console.log(`- FROM_EMAIL: ${fromEmail}`);
  
  // Bail if missing password
  if (!smtpPass) {
    console.error('\n❌ Error: SMTP_PASS is not set!');
    console.error('Please set the SMTP_PASS environment variable.');
    return;
  }
  
  // Create nodemailer transport
  try {
    console.log('\nCreating SMTP transport...');
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection
    console.log('\nVerifying connection to SMTP server...');
    await transport.verify();
    console.log('✅ SMTP server connection verified!');
    
    // Create test account for email testing
    console.log('\nCreating test account for email delivery test...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`Test account created: ${testAccount.user}`);
    
    // Create sample verification link
    const verifyLink = 'https://mysmartscheduler.co/verify-email?token=test-token-12345';
    
    // Generate verification email content
    const html = getEmailVerificationHtml(verifyLink);
    const text = getEmailVerificationText(verifyLink);
    
    // Send verification email
    console.log('\nSending verification email...');
    const info = await transport.sendMail({
      from: `"Smart Scheduler" <${fromEmail}>`,
      to: `"Test User" <${testAccount.user}>`,
      subject: 'Verify Your Email Address',
      text,
      html
    });
    
    // Output results
    console.log('\n✅ Verification email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    // Show preview URL
    if (info.messageId.includes('ethereal')) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      console.log('⚠️ Please open the above URL to view the verification email and confirm it looks correct');
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ SMTP Connection: SUCCESS');
    console.log('✅ Authentication: SUCCESS');
    console.log('✅ Verification Email Sending: SUCCESS');
    console.log('\nVerification email functionality is working correctly!');
    
  } catch (error) {
    console.error(`\n❌ Verification Email Test Failed: ${error.message}`);
    console.error('\nError details:');
    console.error(error);
  }
}

testVerificationEmail().catch(console.error);