/**
 * Production Email System Diagnostic Tool
 * 
 * This comprehensive diagnostic tool helps identify and troubleshoot issues
 * with email delivery in a production environment.
 * 
 * Usage: NODE_ENV=production node server/scripts/productionEmailDiagnostic.js [testEmail]
 */

import fs from 'fs';
import net from 'net';
import tls from 'tls';
import dns from 'dns';
import nodemailer from 'nodemailer';

// Default test email if none provided
const testEmail = process.argv[2] || 'no-reply@example.com';

console.log('========================================================');
console.log('📧 PRODUCTION EMAIL DIAGNOSTIC TOOL');
console.log(`🕒 ${new Date().toISOString()}`);
console.log('========================================================');

// Check environment
console.log(`\nRunning with NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ Warning: Not running in production mode. Set NODE_ENV=production for accurate testing.');
}

// Load environment variables
const emailConfig = {
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@smart-scheduler.ai',
  SMTP_HOST: process.env.SMTP_HOST || 'server.pushbutton-hosting.com',
  SMTP_PORT: process.env.SMTP_PORT || '465',
  SMTP_USER: process.env.SMTP_USER || 'noreply@smart-scheduler.ai',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: process.env.SMTP_SECURE || 'true'
};

// Diagnostic and test functions
async function runDiagnostics() {
  const results = {
    environmentVariables: false,
    dnsResolution: false,
    networkConnectivity: false,
    tlsConnection: false,
    smtpAuthentication: false,
    emailSending: false
  };
  
  const logFile = 'production-email-diagnostics.log';
  fs.writeFileSync(logFile, `PRODUCTION EMAIL DIAGNOSTICS\n${new Date().toISOString()}\n\n`);
  
  // Test 1: Environment Variables
  console.log('\n📋 TEST 1: EMAIL CONFIGURATION VARIABLES');
  fs.appendFileSync(logFile, '--- TEST 1: ENVIRONMENT VARIABLES ---\n');
  
  Object.entries(emailConfig).forEach(([key, value]) => {
    const displayValue = key === 'SMTP_PASS' ? (value ? '[set]' : '[not set]') : value;
    console.log(`- ${key}: ${displayValue}`);
    fs.appendFileSync(logFile, `${key}: ${displayValue}\n`);
  });
  
  // Check for missing required variables
  const requiredVars = ['FROM_EMAIL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(key => !emailConfig[key]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    fs.appendFileSync(logFile, `Missing required variables: ${missingVars.join(', ')}\n`);
  } else {
    console.log('✅ All required environment variables are set');
    fs.appendFileSync(logFile, 'All required variables are set.\n');
    results.environmentVariables = true;
  }

  // Test 2: DNS Resolution
  console.log('\n📋 TEST 2: DNS RESOLUTION');
  fs.appendFileSync(logFile, '\n--- TEST 2: DNS RESOLUTION ---\n');
  
  try {
    console.log(`🔄 Resolving DNS for ${emailConfig.SMTP_HOST}...`);
    const addresses = await dns.promises.resolve(emailConfig.SMTP_HOST);
    console.log(`✅ DNS resolution successful: ${addresses.join(', ')}`);
    fs.appendFileSync(logFile, `DNS resolution successful: ${addresses.join(', ')}\n`);
    results.dnsResolution = true;
    
    // Test 3: Network Connectivity
    console.log('\n📋 TEST 3: NETWORK CONNECTIVITY');
    fs.appendFileSync(logFile, '\n--- TEST 3: NETWORK CONNECTIVITY ---\n');
    
    try {
      console.log(`🔄 Testing TCP connection to ${emailConfig.SMTP_HOST}:${emailConfig.SMTP_PORT}...`);
      
      const testTcpConnection = () => {
        return new Promise((resolve, reject) => {
          const socket = net.createConnection({
            host: emailConfig.SMTP_HOST,
            port: parseInt(emailConfig.SMTP_PORT)
          });
          
          socket.on('connect', () => {
            socket.end();
            resolve(true);
          });
          
          socket.on('error', (err) => {
            reject(err);
          });
          
          // Set a timeout of 5 seconds
          socket.setTimeout(5000, () => {
            socket.destroy();
            reject(new Error('Connection timed out'));
          });
        });
      };
      
      await testTcpConnection();
      console.log('✅ TCP connection successful');
      fs.appendFileSync(logFile, 'TCP connection successful\n');
      results.networkConnectivity = true;
      
      // Test 4: TLS Connection
      if (emailConfig.SMTP_SECURE === 'true') {
        console.log('\n📋 TEST 4: TLS/SSL CONNECTION');
        fs.appendFileSync(logFile, '\n--- TEST 4: TLS/SSL CONNECTION ---\n');
        
        try {
          console.log(`🔄 Testing TLS connection to ${emailConfig.SMTP_HOST}:${emailConfig.SMTP_PORT}...`);
          
          const testTlsConnection = () => {
            return new Promise((resolve, reject) => {
              const socket = tls.connect({
                host: emailConfig.SMTP_HOST,
                port: parseInt(emailConfig.SMTP_PORT),
                rejectUnauthorized: true
              });
              
              socket.on('secureConnect', () => {
                if (socket.authorized) {
                  socket.end();
                  resolve(true);
                } else {
                  reject(new Error('TLS authorization failed: ' + socket.authorizationError));
                }
              });
              
              socket.on('error', (err) => {
                reject(err);
              });
              
              // Set a timeout of 5 seconds
              socket.setTimeout(5000, () => {
                socket.destroy();
                reject(new Error('TLS connection timed out'));
              });
            });
          };
          
          await testTlsConnection();
          console.log('✅ TLS connection successful');
          fs.appendFileSync(logFile, 'TLS connection successful\n');
          results.tlsConnection = true;
        } catch (error) {
          console.error(`❌ TLS connection failed: ${error.message}`);
          fs.appendFileSync(logFile, `TLS connection failed: ${error.message}\n`);
        }
      } else {
        console.log('\n📋 TEST 4: TLS/SSL CONNECTION (SKIPPED)');
        console.log('ℹ️ SMTP_SECURE is not set to true, skipping TLS test');
        fs.appendFileSync(logFile, 'TLS test skipped (SMTP_SECURE is not true)\n');
      }
      
      // Test 5: SMTP Authentication
      console.log('\n📋 TEST 5: SMTP AUTHENTICATION');
      fs.appendFileSync(logFile, '\n--- TEST 5: SMTP AUTHENTICATION ---\n');
      
      try {
        console.log('🔄 Creating SMTP transporter...');
        const transporter = nodemailer.createTransport({
          host: emailConfig.SMTP_HOST,
          port: parseInt(emailConfig.SMTP_PORT),
          secure: emailConfig.SMTP_SECURE === 'true',
          auth: {
            user: emailConfig.SMTP_USER,
            pass: emailConfig.SMTP_PASS
          }
        });
        
        console.log('🔄 Verifying SMTP credentials...');
        await transporter.verify();
        console.log('✅ SMTP authentication successful');
        fs.appendFileSync(logFile, 'SMTP authentication successful\n');
        results.smtpAuthentication = true;
        
        // Test 6: Email Sending
        console.log('\n📋 TEST 6: EMAIL SENDING');
        fs.appendFileSync(logFile, '\n--- TEST 6: EMAIL SENDING ---\n');
        
        try {
          console.log(`🔄 Sending test email to ${testEmail}...`);
          const info = await transporter.sendMail({
            from: `"SmartScheduler Diagnostics" <${emailConfig.FROM_EMAIL}>`,
            to: testEmail,
            subject: `Email System Diagnostic Test ${new Date().toISOString()}`,
            text: `This is an automated test of the SmartScheduler email system.
            
Timestamp: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}

If you received this email, the email delivery system is working correctly.

---
SmartScheduler Support
            `,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
              <h2 style="color: #4a86e8;">Email System Diagnostic Test</h2>
              <p>This is an automated test of the SmartScheduler email system.</p>
              <ul>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
              </ul>
              <p>If you received this email, the email delivery system is working correctly.</p>
              <hr style="border: 0; border-top: 1px solid #eee;">
              <p style="color: #777; font-size: 12px;">SmartScheduler Support</p>
            </div>
            `
          });
          
          console.log('✅ Test email sent successfully!');
          console.log(`- Message ID: ${info.messageId}`);
          fs.appendFileSync(logFile, `Email sent successfully (Message ID: ${info.messageId})\n`);
          results.emailSending = true;
        } catch (error) {
          console.error(`❌ Failed to send test email: ${error.message}`);
          fs.appendFileSync(logFile, `Failed to send test email: ${error.message}\n`);
          
          if (error.code === 'EAUTH') {
            console.error('\n💡 Authentication Error Details:');
            console.error('- This is often caused by incorrect SMTP_USER or SMTP_PASS values');
            console.error('- Check if your password contains special characters that need escaping');
            fs.appendFileSync(logFile, 'Authentication error - likely password issue\n');
          }
        }
      } catch (error) {
        console.error(`❌ SMTP authentication failed: ${error.message}`);
        fs.appendFileSync(logFile, `SMTP authentication failed: ${error.message}\n`);
        
        if (error.code === 'EAUTH') {
          console.error('\n💡 Authentication Error Details:');
          console.error('- Check your SMTP_USER and SMTP_PASS values');
          console.error('- Verify these credentials work with a mail client');
          fs.appendFileSync(logFile, 'Authentication error - check credentials\n');
        }
      }
    } catch (error) {
      console.error(`❌ Network connectivity test failed: ${error.message}`);
      fs.appendFileSync(logFile, `Network connectivity test failed: ${error.message}\n`);
      
      console.error('\n💡 Network Troubleshooting:');
      console.error('- Check if a firewall is blocking outbound connections to this port');
      console.error('- Verify that the server has internet connectivity');
      console.error(`- Try a different port if your provider supports it`);
    }
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    fs.appendFileSync(logFile, `DNS resolution failed: ${error.message}\n`);
    
    console.error('\n💡 DNS Troubleshooting:');
    console.error('- Check if the SMTP_HOST is spelled correctly');
    console.error('- Verify that the server has DNS resolution capabilities');
    console.error('- Try using an IP address directly instead of hostname');
  }
  
  // Summary of results
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  fs.appendFileSync(logFile, '\n--- DIAGNOSTIC SUMMARY ---\n');
  
  const testResults = [
    { name: 'Environment Variables', result: results.environmentVariables },
    { name: 'DNS Resolution', result: results.dnsResolution },
    { name: 'Network Connectivity', result: results.networkConnectivity },
    { name: 'TLS Connection', result: emailConfig.SMTP_SECURE !== 'true' ? 'skipped' : results.tlsConnection },
    { name: 'SMTP Authentication', result: results.smtpAuthentication },
    { name: 'Email Sending', result: results.emailSending }
  ];
  
  testResults.forEach(test => {
    const status = test.result === 'skipped' ? '⏩' : test.result ? '✅' : '❌';
    const resultText = test.result === 'skipped' ? 'SKIPPED' : test.result ? 'PASS' : 'FAIL';
    console.log(`${status} ${test.name}: ${resultText}`);
    fs.appendFileSync(logFile, `${test.name}: ${resultText}\n`);
  });
  
  // Overall status
  const requiredTests = Object.entries(results)
    .filter(([key]) => key !== 'tlsConnection' || emailConfig.SMTP_SECURE === 'true');
  
  const allPassed = requiredTests.every(([, result]) => result);
  
  console.log('\n========================================================');
  if (allPassed) {
    console.log('✅ OVERALL RESULT: ALL TESTS PASSED');
    console.log('Your email system appears to be configured correctly.');
    fs.appendFileSync(logFile, 'OVERALL: PASS - Email system configured correctly\n');
  } else {
    console.log('❌ OVERALL RESULT: SOME TESTS FAILED');
    console.log('Review the test results above to identify and fix issues.');
    fs.appendFileSync(logFile, 'OVERALL: FAIL - See specific test results\n');
  }
  console.log('========================================================');
  
  console.log(`\nDetailed diagnostics log written to: ${logFile}`);
}

// Run all diagnostics
runDiagnostics().catch(error => {
  console.error('An unexpected error occurred while running diagnostics:', error);
  process.exit(1);
});