// Production Email Delivery Test Script
// This script is designed to be run in the production environment to test email delivery
import nodemailer from 'nodemailer';

async function testProductionEmailDelivery() {
  console.log('🔍 PRODUCTION EMAIL DELIVERY TEST');
  console.log('================================');
  
  // Get configuration from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  // Get or create sender email address
  let fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  if (fromEmail.startsWith('@')) {
    fromEmail = 'noreply' + fromEmail;
  }
  
  // Get test recipient from command line or use default
  const testRecipient = process.argv[2] || 'test@example.com';
  
  // Display configuration
  console.log('\nCurrent Configuration:');
  console.log(`- SMTP_HOST: ${smtpHost || '[not set]'}`);
  console.log(`- SMTP_PORT: ${smtpPort}`);
  console.log(`- SMTP_USER: ${smtpUser ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  console.log(`- FROM_EMAIL: ${fromEmail}`);
  console.log(`- TEST_RECIPIENT: ${testRecipient}`);
  
  // Check if configuration is complete
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('\n❌ SMTP configuration is incomplete. Cannot proceed with testing.');
    console.error('Required environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
    return;
  }
  
  try {
    // Create SMTP transport
    console.log('\n🔄 Creating SMTP transport...');
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      // Debug options
      debug: true,
      logger: true,
      // Connection options
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 20000, // 20 seconds
      // TLS options
      tls: {
        rejectUnauthorized: false // Don't fail on invalid certs in test mode
      }
    });
    
    // Test connection
    console.log('\n🔄 Verifying SMTP connection...');
    await transport.verify();
    console.log('✅ SMTP connection successful!');
    
    // Send test email to actual recipient
    console.log(`\n🔄 Sending test email to ${testRecipient}...`);
    const info = await transport.sendMail({
      from: `"SmartScheduler" <${fromEmail}>`,
      to: testRecipient,
      subject: 'SmartScheduler Production Email Test',
      text: 
`This is a test email from SmartScheduler.

If you are receiving this email, it means our email delivery system is working correctly in the production environment.

Time: ${new Date().toISOString()}
Server: ${process.env.REPL_SLUG || 'unknown'}

Thank you for helping us test our system!

- The SmartScheduler Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a86e8;">SmartScheduler Production Email Test</h2>
          
          <p>This is a test email from SmartScheduler.</p>
          
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; border-left: 4px solid #4a86e8;">
            If you are receiving this email, it means our email delivery system is working correctly in the production environment.
          </p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Server:</strong> ${process.env.REPL_SLUG || 'unknown'}</p>
          </div>
          
          <p>Thank you for helping us test our system!</p>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777;">
            - The SmartScheduler Team
          </p>
        </div>
      `
    });
    
    // Display results
    console.log('\n✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Response: ${info.response}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log(`1. Check the inbox for: ${testRecipient}`);
    console.log('2. Confirm the email was delivered properly');
    console.log('3. Verify the formatting of the email');
    
    // Final summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log('✅ SMTP Connection: SUCCESS');
    console.log('✅ Email Sending: SUCCESS');
    console.log('📧 Production email delivery is working correctly!');
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Error:');
      console.error('- Check SMTP_USER and SMTP_PASS are correct');
      console.error('- Verify the SMTP server accepts these credentials');
      console.error('- Check if the account has sending permissions');
    } else if (error.code === 'EENVELOPE') {
      console.error('\n💡 Recipient Rejection Error:');
      console.error(`- The recipient address (${testRecipient}) was rejected`);
      console.error('- This could be due to:');
      console.error('  * Invalid email format');
      console.error('  * Domain or recipient blacklisting');
      console.error('  * Missing or invalid DNS records for the recipient domain');
      console.error('  * SMTP server policies restricting external domains');
      console.error('\n- Try with a different recipient email address');
      console.error('- Use a real, active email address for testing');
    } else if (error.code === 'ESOCKET') {
      console.error('\n💡 Socket Connection Error:');
      console.error('- Check if SMTP_PORT and SMTP_SECURE settings match');
      console.error('- Verify network connectivity to the SMTP server');
      console.error('- Check for firewall restrictions');
    }
    
    console.error('\nDetailed error information:');
    console.error(error);
  }
}

// Run the test
testProductionEmailDelivery().catch(console.error);