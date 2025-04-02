// Simple SMTP Test Script
// A lightweight script to test SMTP connectivity with minimum dependencies
import nodemailer from 'nodemailer';

async function testSmtp() {
  console.log('🔍 SIMPLE SMTP TEST TOOL');
  console.log('=======================');
  
  // Configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  
  // Show current configuration
  console.log('\nCurrent Configuration:');
  console.log(`- SMTP_HOST: ${smtpHost || 'not set'}`);
  console.log(`- SMTP_PORT: ${smtpPort}`);
  console.log(`- SMTP_USER: ${smtpUser ? 'set (hidden)' : 'not set'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? 'set (hidden)' : 'not set'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  console.log(`- FROM_EMAIL: ${fromEmail}`);
  
  // Bail if missing required config
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('\n❌ Error: SMTP configuration is incomplete!');
    console.error('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
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
      // Add debug options for more detailed output
      debug: true,
      logger: true,
      // Don't fail on self-signed certs
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
    
    // Send test email
    console.log('\nSending test email...');
    const info = await transport.sendMail({
      from: `"SMTP Test" <${fromEmail}>`,
      to: `"Test Recipient" <${testAccount.user}>`,
      subject: 'SMTP Test Message',
      text: 'This is a test email to verify SMTP functionality.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4a86e8;">SMTP Test</h2>
          <p>This email confirms your SMTP server is working correctly!</p>
          <p><strong>Server:</strong> ${smtpHost}:${smtpPort}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `
    });
    
    // Output results
    console.log('\n✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    // If using ethereal, show preview URL
    if (info.messageId.includes('ethereal')) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ SMTP Connection: SUCCESS');
    console.log('✅ Authentication: SUCCESS');
    console.log('✅ Email Sending: SUCCESS');
    console.log('\nYour SMTP configuration is working correctly!');
    
  } catch (error) {
    console.error(`\n❌ SMTP Test Failed: ${error.message}`);
    
    // Provide helpful tips based on error code
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication failed. Please check:');
      console.error('- Your SMTP_USER and SMTP_PASS are correct');
      console.error('- The SMTP server accepts these credentials');
      console.error('- For Gmail or similar services, make sure to use an app password if 2FA is enabled');
    } else if (error.code === 'ECONNECTION') {
      console.error('\nConnection failed. Please check:');
      console.error('- The SMTP_HOST is correct and reachable');
      console.error('- The SMTP_PORT is correct and not blocked by a firewall');
      console.error('- Network connectivity is available');
    } else if (error.code === 'ESOCKET') {
      console.error('\nSocket error. Please check:');
      console.error('- The SMTP_SECURE setting matches the port (true for 465, false for 587)');
      console.error('- The connection was not dropped due to timeout or network issues');
    }
    
    console.error('\nError details:');
    console.error(error);
  }
}

testSmtp().catch(console.error);