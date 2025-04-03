// Simple Email Test Script
import nodemailer from 'nodemailer';

async function testEmail() {
  try {
    console.log('Testing email sending...');
    
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
    
    // Create transport
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verify connection
    await transport.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Create a test account
    const testAccount = await nodemailer.createTestAccount();
    console.log(`Created test account: ${testAccount.user}`);
    
    // Send test email
    const info = await transport.sendMail({
      from: `"Smart Scheduler" <${fromEmail}>`,
      to: testAccount.user,
      subject: "Test Email",
      text: "This is a test email sent from Smart Scheduler.",
      html: "<div><h2>Test Email</h2><p>This is a test email sent from Smart Scheduler.</p></div>"
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    if (info.messageId.includes('ethereal')) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending test failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.response) console.error('Server response:', error.response);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      response: error.response
    };
  }
}

testEmail()
  .then(result => {
    console.log('Test completed:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });