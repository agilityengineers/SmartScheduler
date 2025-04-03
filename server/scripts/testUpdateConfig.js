// New SMTP Connectivity Test
// Tests the SMTP connection with updated noreply@mysmartscheduler.co credentials
import nodemailer from 'nodemailer';

async function testUpdatedSmtp() {
  console.log('🔍 UPDATED SMTP TEST TOOL');
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
      subject: 'SMTP Test Message - Updated Config',
      text: 'This is a test email to verify SMTP functionality with updated configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4a86e8;">SMTP Test - Updated Config</h2>
          <p>This email confirms your SMTP server is working correctly with the updated configuration!</p>
          <p><strong>Server:</strong> ${smtpHost}:${smtpPort}</p>
          <p><strong>From:</strong> ${fromEmail}</p>
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
    console.log('\nYour updated SMTP configuration is working correctly!');
    
  } catch (error) {
    console.error(`\n❌ SMTP Test Failed: ${error.message}`);
    
    // Provide helpful tips based on error code
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication failed. Please check:');
      console.error('- The SMTP_USER (noreply@mysmartscheduler.co) has been properly setup on your mail server');
      console.error('- The SMTP_PASS environment variable is correct for this account');
      console.error('- The mail server accepts these credentials');
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

testUpdatedSmtp().catch(console.error);