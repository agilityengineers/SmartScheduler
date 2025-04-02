// Production email diagnostic script
// This script tests SMTP connectivity with detailed error reporting
import nodemailer from 'nodemailer';

async function testSmtpConnection() {
  console.log('🔍 PRODUCTION EMAIL DIAGNOSTIC TOOL 🔍');
  console.log('=======================================');
  console.log('\nEnvironment Variables Check:');
  
  // Don't show the actual values of sensitive data
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  
  console.log(`- SMTP_HOST: ${smtpHost || '[not set]'}`);
  console.log(`- SMTP_PORT: ${smtpPort || '[not set]'}`);
  console.log(`- SMTP_USER: ${smtpUser ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  console.log(`- FROM_EMAIL: ${fromEmail}`);
  
  // Basic validation
  let configValid = true;
  if (!smtpHost) {
    console.error('❌ SMTP_HOST is missing');
    configValid = false;
  }
  if (!smtpUser) {
    console.error('❌ SMTP_USER is missing');
    configValid = false;
  }
  if (!smtpPass) {
    console.error('❌ SMTP_PASS is missing');
    configValid = false;
  }
  
  if (!configValid) {
    console.error('\n❌ Error: SMTP configuration is incomplete. Cannot proceed with testing.');
    return;
  }
  
  console.log('\n✅ SMTP configuration is complete. Starting tests...');
  
  // 1. Test SMTP Connection
  console.log('\n🔄 Step 1: Testing SMTP Connection');
  console.log(`Connecting to ${smtpHost}:${smtpPort} (secure: ${smtpSecure})...`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // For better debugging
      debug: true,
      logger: true,
      // Increase timeouts for slow connections
      connectionTimeout: 15000, // 15 seconds
      socketTimeout: 15000,     // 15 seconds
      tls: {
        // Don't fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    console.log('🔄 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful! Server ready to accept messages.');
    
    // 2. Test Email Delivery
    console.log('\n🔄 Step 2: Testing Email Delivery');
    const testRecipients = [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
      { email: 'testuser@temporary-mail.net', name: 'Test User Temporary' }
    ];
    
    // Enhanced test with structured results
    const results = [];
    
    for (const recipient of testRecipients) {
      console.log(`\n📧 Test sending email to ${recipient.email}...`);
      
      try {
        const info = await transporter.sendMail({
          from: `"SmartScheduler" <${fromEmail}>`,
          to: `"${recipient.name}" <${recipient.email}>`,
          subject: 'Email Verification Test',
          text: 'This is a test email to verify SMTP delivery in production. If you received this, email delivery is working!',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
              <h2 style="color: #4a86e8;">Email Delivery Test</h2>
              <p>This is a test email to verify SMTP delivery in production.</p>
              <p><strong>If you received this, email delivery is working!</strong></p>
              <hr />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from SmartScheduler's diagnostic tool.
                Time sent: ${new Date().toISOString()}
              </p>
            </div>
          `
        });
        
        results.push({
          recipient: recipient.email,
          success: true,
          messageId: info.messageId,
          response: info.response
        });
        
        console.log(`✅ Email sent successfully to ${recipient.email}`);
        console.log(`- Message ID: ${info.messageId}`);
        console.log(`- Response: ${info.response}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${recipient.email}:`);
        console.error(`- Error: ${error.message}`);
        
        // Add detailed error analysis
        if (error.code === 'EENVELOPE') {
          console.error('💡 EENVELOPE error suggests recipient rejection issues:');
          console.error('   - The recipient address may be invalid or rejected by the server');
          console.error('   - The domain may have SPF, DKIM, or DMARC policies preventing delivery');
          console.error('   - The mail server may be blacklisting test or temporary email domains');
        } else if (error.code === 'ESOCKET') {
          console.error('💡 ESOCKET error suggests connection timeout issues:');
          console.error('   - The mail server may be slow to respond');
          console.error('   - Network connectivity issues may be present');
          console.error('   - Firewall or security settings may be blocking the connection');
        }
        
        results.push({
          recipient: recipient.email,
          success: false,
          error: error.message,
          code: error.code || 'unknown'
        });
      }
    }
    
    // 3. Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('============================');
    const successCount = results.filter(r => r.success).length;
    console.log(`Total tests: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${results.length - successCount}`);
    
    console.log('\nDetailed Results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.recipient}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (result.success) {
        console.log(`   Message ID: ${result.messageId}`);
      } else {
        console.log(`   Error: ${result.error}`);
        console.log(`   Code: ${result.code}`);
      }
    });
    
    // 4. Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('============================');
    
    if (successCount === results.length) {
      console.log('✅ All email tests passed! Your SMTP configuration is working correctly.');
      console.log('You can now check if the test emails were received properly.');
    } else if (successCount > 0) {
      console.log('⚠️ Some email tests succeeded, but others failed.');
      console.log('This suggests there might be issues with specific recipient addresses or domains.');
      console.log('Tips:');
      console.log('- Check if the failed addresses have valid DNS records');
      console.log('- Try with different recipient domains to identify patterns');
      console.log('- Consider using verified delivery domains for testing');
    } else {
      console.log('❌ All email tests failed!');
      console.log('Tips:');
      console.log('- Double-check your SMTP credentials');
      console.log('- Ensure your SMTP server allows sending to external domains');
      console.log('- Check if the FROM_EMAIL domain has proper DNS records (SPF, DKIM)');
      console.log('- Consider contacting your SMTP provider for assistance');
    }
    
  } catch (error) {
    console.error(`\n❌ SMTP Connection Error: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error('💡 Authentication failed. Please check your SMTP_USER and SMTP_PASS.');
    } else if (error.code === 'ESOCKET') {
      console.error('💡 Socket error. This might indicate:');
      console.error('   - The SMTP server is not reachable');
      console.error('   - The port may be blocked or incorrect');
      console.error('   - The secure setting may be wrong for this server');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection timed out. This might indicate:');
      console.error('   - The server address is incorrect');
      console.error('   - Network connectivity issues');
      console.error('   - Firewall blocking connection');
    }
    
    console.error('\nDetailed error information:');
    console.error(error.stack || error);
  }
}

testSmtpConnection().catch(console.error);