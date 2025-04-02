// SMTP Configuration Diagnostic Tool
// This script checks SMTP configuration and attempts to verify connection
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promises as fs } from 'fs';

async function checkDnsRecords(domain) {
  console.log(`\n🔍 Checking DNS records for domain: ${domain}`);
  
  try {
    // Check MX records
    console.log('Checking MX records...');
    const mxRecords = await dns.promises.resolveMx(domain);
    console.log('✅ MX records found:');
    mxRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
  } catch (error) {
    console.error(`❌ Error retrieving MX records: ${error.message}`);
    console.error('   This might cause email delivery issues with this domain.');
  }
  
  try {
    // Check SPF records (TXT records containing "spf")
    console.log('\nChecking SPF records...');
    const txtRecords = await dns.promises.resolveTxt(domain);
    const spfRecords = txtRecords.filter(record => record.join('').includes('spf'));
    
    if (spfRecords.length > 0) {
      console.log('✅ SPF records found:');
      spfRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.join('')}`);
      });
    } else {
      console.error('⚠️ No SPF records found. This might affect email deliverability.');
    }
  } catch (error) {
    console.error(`❌ Error retrieving SPF records: ${error.message}`);
  }
  
  try {
    // Check for DMARC
    console.log('\nChecking DMARC records...');
    const dmarcDomain = `_dmarc.${domain}`;
    const dmarcRecords = await dns.promises.resolveTxt(dmarcDomain);
    
    if (dmarcRecords.length > 0) {
      console.log('✅ DMARC records found:');
      dmarcRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.join('')}`);
      });
    } else {
      console.error('⚠️ No DMARC records found. This might affect email deliverability.');
    }
  } catch (error) {
    console.error(`❌ No DMARC records found for ${domain}`);
  }
}

async function testSmtpConfiguration() {
  console.log('🔍 SMTP CONFIGURATION DIAGNOSTIC TOOL 🔍');
  console.log('======================================');
  
  // For diagnostics, we include env var analysis
  await fs.writeFile(
    'smtp_env_vars.log', 
    `SMTP Environment Variables (${new Date().toISOString()}):\n\n` +
    `SMTP_HOST=${process.env.SMTP_HOST || '[not set]'}\n` +
    `SMTP_PORT=${process.env.SMTP_PORT || '[not set]'}\n` +
    `SMTP_USER=${process.env.SMTP_USER ? '[set]' : '[not set]'}\n` +
    `SMTP_PASS=${process.env.SMTP_PASS ? '[set]' : '[not set]'}\n` +
    `SMTP_SECURE=${process.env.SMTP_SECURE || '[not set]'}\n` +
    `FROM_EMAIL=${process.env.FROM_EMAIL || '[not set]'}\n\n` +
    `BASE_URL=${process.env.BASE_URL || '[not set]'}\n` +
    `NODE_ENV=${process.env.NODE_ENV || '[not set]'}\n`
  );
  
  console.log('Environment variables snapshot saved to smtp_env_vars.log');
  
  // Get configuration from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  // Get sender email address
  let fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  
  // If email is missing username part (starts with @), add 'noreply'
  if (fromEmail.startsWith('@')) {
    fromEmail = 'noreply' + fromEmail;
  }
  
  // Check basic configuration
  console.log('\n📋 SMTP Configuration:');
  console.log(`- SMTP_HOST: ${smtpHost || '[not set]'}`);
  console.log(`- SMTP_PORT: ${smtpPort || '[not set]'}`);
  console.log(`- SMTP_USER: ${smtpUser ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  console.log(`- FROM_EMAIL: ${fromEmail}`);
  
  // Basic validation
  let configValid = true;
  if (!smtpHost) {
    console.error('❌ SMTP_HOST is missing or invalid');
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
    console.error('\n❌ SMTP configuration is incomplete. Cannot proceed with testing.');
    return;
  }
  
  // Check DNS configuration for sender domain
  const senderDomain = fromEmail.split('@')[1];
  await checkDnsRecords(senderDomain);
  
  // Create a Nodemailer transporter for testing
  console.log(`\n🔄 Testing SMTP Connection to ${smtpHost}:${smtpPort}...`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      debug: true, // Enable debug logs for detailed output
      logger: true, // Enable logger for additional info
      tls: {
        // Don't fail on invalid certs in test mode
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 10000 // 10 seconds
    });
    
    // Verify connection configuration
    console.log('Verifying connection and authentication...');
    await transporter.verify();
    console.log('✅ SMTP server connection verified successfully!');
    
    // Test nodemailer transport by sending a test email
    console.log('\n🔄 Testing transport with a test message');
    
    // Create a test account on Ethereal
    console.log('Creating Ethereal test account for message testing...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ Test account created');
    
    console.log('\n🔄 Sending test message to Ethereal account...');
    const info = await transporter.sendMail({
      from: `"SMTP Diagnostic" <${fromEmail}>`,
      to: `"Test Recipient" <${testAccount.user}>`, // Send to Ethereal test account
      subject: 'SMTP Configuration Test',
      text: 'If you can read this, your SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #4a86e8;">SMTP Configuration Test</h2>
          <p>If you can read this, your SMTP configuration is working correctly.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            This is an automated message from the SMTP diagnostic tool.
            Time sent: ${new Date().toISOString()}
          </p>
        </div>
      `
    });
    
    console.log('✅ Test message sent successfully!');
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    // Final Assessment
    console.log('\n📊 SMTP CONFIGURATION ASSESSMENT');
    console.log('==================================');
    console.log('✅ Basic configuration: Valid');
    console.log('✅ SMTP connection: Successful');
    console.log('✅ Authentication: Successful');
    console.log('✅ Message sending: Successful');
    console.log('\n💯 SUCCESS: Your SMTP configuration is working correctly!');
    
  } catch (error) {
    console.error(`\n❌ SMTP Test Failed: ${error.message}`);
    console.error('Detailed error information:');
    console.error(JSON.stringify(error, null, 2));
    
    // Provide specific advice based on error code
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Error Analysis:');
      console.error('- Check if SMTP_USER and SMTP_PASS are correct');
      console.error('- Make sure the SMTP server allows this authentication method');
      console.error('- If using Gmail or similar service, check if less secure app access is enabled');
      console.error('- Some providers require app-specific passwords instead of main account password');
    } else if (error.code === 'ESOCKET') {
      console.error('\n💡 Socket Connection Error Analysis:');
      console.error('- Check if SMTP_HOST and SMTP_PORT are correct');
      console.error('- Make sure the SMTP_SECURE setting matches the port (usually 465 for secure)');
      console.error('- Check if there are firewall issues blocking the connection');
      console.error('- Verify the SMTP server is running and accepting connections');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n💡 Connection Error Analysis:');
      console.error('- The SMTP server could not be reached');
      console.error('- This could be a network issue or incorrect host/port');
      console.error('- Check if the server requires a VPN or is on a private network');
    }
    
    // Save detailed error information to a file
    try {
      await fs.writeFile(
        'smtp_error_details.log',
        `SMTP Error Details (${new Date().toISOString()}):\n\n` +
        `Error: ${error.message}\n` +
        `Code: ${error.code || 'unknown'}\n\n` +
        `Stack Trace:\n${error.stack || '[not available]'}\n\n` +
        `Full Error Object:\n${JSON.stringify(error, null, 2)}\n`
      );
      console.error('\nDetailed error information has been saved to smtp_error_details.log');
    } catch (writeError) {
      console.error('Failed to write error details to file:', writeError.message);
    }
  }
}

testSmtpConfiguration().catch(console.error);