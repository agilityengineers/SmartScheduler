// Real Email Test Script
import nodemailer from 'nodemailer';

async function testRealEmail(toEmail) {
  try {
    console.log(`Testing email sending to real address: ${toEmail}...`);
    
    // Get configuration from environment
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const fromEmail = process.env.FROM_EMAIL;
    
    console.log(`Configuration:
- SMTP_HOST: ${smtpHost}
- SMTP_PORT: ${smtpPort}
- SMTP_USER: ${smtpUser ? 'Set ✓' : 'Not set ✗'}
- SMTP_PASS: ${smtpPass ? 'Set ✓' : 'Not set ✗'}
- SMTP_SECURE: ${smtpSecure}
- FROM_EMAIL: ${fromEmail}
    `);
    
    // Create transport with detailed logging
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      debug: true, // Enable debug output
      logger: true, // Log information about the mail
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verify connection
    await transport.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Generate a test ID
    const testId = Math.random().toString(36).substring(2, 10);
    
    // Send test email
    const info = await transport.sendMail({
      from: `"Smart Scheduler" <${fromEmail}>`,
      to: toEmail,
      subject: `Test Email [${testId}]`,
      text: `This is a test email sent from Smart Scheduler. Test ID: ${testId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a86e8;">Test Email</h2>
          <p>This is a test email sent from Smart Scheduler.</p>
          <p><strong>Test ID:</strong> ${testId}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> ${smtpHost}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            If you received this email, it confirms the email delivery system is working correctly.
          </p>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Recipient: ${toEmail}`);
    
    return { 
      success: true,
      messageId: info.messageId,
      testId: testId
    };
  } catch (error) {
    console.error('❌ Email sending test failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.response) console.error('Server response:', error.response);
    
    // Additional diagnostics for common errors
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Error:');
      console.error('- Check SMTP_USER and SMTP_PASS are correct');
      console.error('- Verify the SMTP server accepts these credentials');
      console.error('- Check if the account has sending permissions');
    } else if (error.code === 'EENVELOPE') {
      console.error('\n💡 Recipient Rejection Error:');
      console.error(`- The recipient address was rejected`);
      console.error('- Check if the email format is valid');
      console.error('- The server might have restrictions on recipient domains');
    } else if (error.code === 'ESOCKET') {
      console.error('\n💡 Socket Connection Error:');
      console.error('- Check if SMTP server is reachable');
      console.error('- Verify port and security settings are correct');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      response: error.response
    };
  }
}

// Get the email from command line arguments
const toEmail = process.argv[2];

if (!toEmail) {
  console.error('❌ No recipient email provided');
  console.error('Usage: node test-real-email.js recipient@example.com');
  process.exit(1);
}

testRealEmail(toEmail)
  .then(result => {
    console.log('Test completed:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });