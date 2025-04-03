/**
 * Email Delivery Test with Fallback
 * 
 * This script tests the full email delivery chain including fallback mechanisms.
 * It first tries delivery through Google Email, and if that fails, it falls back
 * to legacy SMTP just like the production system does.
 * 
 * Usage: node server/scripts/testEmailWithFallback.js recipient@example.com [--force-fallback]
 * Options:
 *   --force-fallback, -f    Force the primary method to fail, testing the fallback mechanism
 */

// Use ES Module imports
import nodemailer from 'nodemailer';
import dns from 'dns';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

// Simplified implementation of GoogleEmailService for this test script
class GoogleEmailService {
  constructor(config) {
    this.config = config;
    this.transport = null;
    
    console.log('🔄 Google Email Service initializing...');
    console.log(`- Email: ${this.config.email}`);
    console.log(`- Display Name: ${this.config.name || 'Not set'}`);
    console.log(`- Password: ${this.config.password ? '[Set]' : '[Not set]'}`);
  }
  
  initTransport() {
    if (this.transport) {
      return this.transport;
    }
    
    console.log('🔄 Creating Google Email transport...');
    
    this.transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: this.config.email,
        pass: this.config.password
      },
      debug: true, // Enable debug output
      logger: true, // Log information about the mail
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 30000, // 30 seconds
      tls: {
        rejectUnauthorized: false // Don't reject invalid certs in test
      }
    });
    
    return this.transport;
  }
  
  async verifyConnection() {
    try {
      const transport = this.initTransport();
      await transport.verify();
      console.log('✅ Google Email SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Google Email SMTP connection failed:', error.message);
      return false;
    }
  }
  
  async sendEmail(options) {
    console.log(`📧 Preparing to send email via Google to ${options.to}`);
    
    // Create a result object
    const result = {
      success: false,
      smtpDiagnostics: {
        configured: !!this.config.email && !!this.config.password,
        attempted: false,
        host: 'smtp.gmail.com',
        port: 465,
        user: this.config.email,
        secure: true
      }
    };
    
    // Check if configured
    if (!this.config.email || !this.config.password) {
      console.error('❌ Google Email not configured (missing email or password)');
      result.error = {
        message: 'Google Email configuration missing',
        code: 'CONFIG_MISSING'
      };
      return result;
    }
    
    try {
      // Mark as attempted
      result.smtpDiagnostics.attempted = true;
      
      // Get transport
      const transport = this.initTransport();
      
      // Create from address with optional display name
      const from = this.config.name 
        ? `"${this.config.name}" <${this.config.email}>`
        : this.config.email;
      
      // Send the email
      const info = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      
      // Log success
      console.log(`✅ Google Email delivery successful to ${options.to}`);
      console.log(`- Message ID: ${info.messageId}`);
      
      // Update result
      result.success = true;
      result.messageId = info.messageId;
      result.method = 'google';
      
      return result;
    } catch (error) {
      // Log error
      console.error('❌ Google Email delivery failed:', error.message);
      
      // Update result with error details
      result.error = {
        message: error.message,
        code: error.code,
        details: error.response || error.stack
      };
      
      return result;
    }
  }
}

// Get the command line arguments
const args = process.argv.slice(2);
let toEmail = null;
let forceFallback = false;

// Parse command line arguments
for (const arg of args) {
  if (arg === '--force-fallback' || arg === '-f') {
    forceFallback = true;
  } else if (!toEmail && arg.includes('@')) {
    toEmail = arg;
  }
}

if (!toEmail) {
  console.error('❌ No recipient email provided');
  console.error('Usage: node testEmailWithFallback.js recipient@example.com [--force-fallback]');
  console.error('Options:');
  console.error('  --force-fallback, -f    Force the primary method to fail, testing the fallback mechanism');
  process.exit(1);
}

// Display info about force fallback
if (forceFallback) {
  console.log('⚠️ FALLBACK TEST MODE: Primary delivery method will be forced to fail');
}

// Log header
console.log('========================================================');
console.log('📧 EMAIL DELIVERY TEST WITH FALLBACK');
console.log(`🕒 ${new Date().toISOString()}`);
console.log('========================================================');

// Test environment details
console.log('\n📋 TEST ENVIRONMENT:');
console.log(`- Node.js: ${process.version}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- PID: ${process.pid}`);
console.log(`- Testing email delivery to: ${toEmail}`);

// Create a simplified loadEnvironment function for this script
function loadEnvironment() {
  console.log('\n🔄 Loading email configuration...');
  
  // Check if SMTP environment variables are set
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  console.log(`- SMTP configuration: ${smtpConfigured ? 'FOUND' : 'NOT FOUND'}`);
  
  // Check if Google Email environment variables are set
  const googleConfigured = !!(process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD);
  console.log(`- Google Email configuration: ${googleConfigured ? 'FOUND' : 'NOT FOUND'}`);
  
  return {
    isConfigured: smtpConfigured || googleConfigured
  };
}

// Load environment with our simplified function
const envConfig = loadEnvironment();
console.log(`- Environment loaded: ${envConfig.isConfigured ? 'SUCCESS' : 'FAILURE'}`);

// Check Google Email configuration
const googleEmailConfigured = !!(process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD);

console.log('\n📬 GOOGLE EMAIL CONFIGURATION:');
console.log(`- GOOGLE_EMAIL: ${process.env.GOOGLE_EMAIL || '[not set]'}`);
console.log(`- GOOGLE_EMAIL_PASSWORD: ${process.env.GOOGLE_EMAIL_PASSWORD ? '[set]' : '[not set]'}`);
console.log(`- GOOGLE_EMAIL_NAME: ${process.env.GOOGLE_EMAIL_NAME || '[not set]'}`);
console.log(`- Configured: ${googleEmailConfigured ? 'YES ✓' : 'NO ✗'}`);

// Check legacy SMTP configuration
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

console.log('\n📧 LEGACY SMTP CONFIGURATION:');
console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || '[not set]'}`);
console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || '[not set]'}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER ? '[set]' : '[not set]'}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[set]' : '[not set]'}`);
console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' ? 'true' : 'false'}`);
console.log(`- Configured: ${smtpConfigured ? 'YES ✓' : 'NO ✗'}`);

// Generate a unique test ID
const testId = Math.random().toString(36).substring(2, 8);

// Email content
const emailOptions = {
  to: toEmail,
  subject: `Email Test with Fallback [${testId}]`,
  text: `This is a test email with fallback support.
      
Test ID: ${testId}
Time: ${new Date().toISOString()}

This test verifies the email delivery system with fallback between Google Email and Legacy SMTP.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a86e8;">Email Test with Fallback</h2>
      <p>This is a test email with fallback support.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Test ID:</strong> ${testId}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
      
      <p>This test verifies the email delivery system with fallback between Google Email and Legacy SMTP.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #777; font-size: 12px;">
        This is an automated diagnostic email. Please do not reply.
      </p>
    </div>
  `
};

// Main test function
async function testEmailWithFallback() {
  let success = false;
  
  // STEP 1: Try Google Email
  if (googleEmailConfigured) {
    console.log('\n🔄 STEP 1: Testing Google Email...');
    
    // If forceFallback is true, skip to fallback
    if (forceFallback) {
      console.log('⚠️ FORCED FALLBACK MODE: Simulating Google Email failure');
      console.log('- Will attempt fallback to legacy SMTP');
    } else {
      try {
        // Initialize Google Email Service
        const googleEmailService = new GoogleEmailService({
          email: process.env.GOOGLE_EMAIL,
          password: process.env.GOOGLE_EMAIL_PASSWORD,
          name: process.env.GOOGLE_EMAIL_NAME
        });
        
        // Verify connection
        console.log('- Verifying Google Email SMTP connection...');
        const connected = await googleEmailService.verifyConnection();
        
        if (connected) {
          console.log('✅ Google Email SMTP connection verified');
          
          // Send test email
          console.log('- Sending test email via Google Email...');
          const result = await googleEmailService.sendEmail(emailOptions);
          
          if (result.success) {
            console.log('✅ Google Email delivery successful!');
            console.log(`- Message ID: ${result.messageId}`);
            console.log(`- Test ID: ${testId}`);
            success = true;
            
            // No need to try fallback
            return { success: true, method: 'google', messageId: result.messageId };
          } else {
            console.error('❌ Google Email delivery failed:', result.error?.message);
            console.log('- Will attempt fallback to legacy SMTP');
          }
        } else {
          console.error('❌ Google Email connection failed');
          console.log('- Will attempt fallback to legacy SMTP');
        }
      } catch (error) {
        console.error('❌ Google Email exception:', error.message);
        console.log('- Will attempt fallback to legacy SMTP');
      }
    }
  } else {
    console.log('⚠️ Google Email not configured, skipping this step');
  }
  
  // STEP 2: Try Legacy SMTP (fallback)
  if (smtpConfigured) {
    console.log('\n🔄 STEP 2: Testing Legacy SMTP (Fallback)...');
    
    try {
      // Create SMTP transport
      const smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        debug: true, // Enable debug output
        logger: true, // Log information about the mail
        connectionTimeout: 5000, // 5 seconds - reduce from default to avoid long timeouts
        socketTimeout: 5000, // 5 seconds - reduce from default to avoid long timeouts
        tls: {
          rejectUnauthorized: false // Don't reject invalid certs
        }
      });
      
      // Verify connection
      console.log('- Verifying SMTP connection...');
      await smtpTransport.verify();
      console.log('✅ SMTP connection verified');
      
      // Send test email
      console.log('- Sending test email via legacy SMTP...');
      const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
      
      const info = await smtpTransport.sendMail({
        from: fromEmail,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html
      });
      
      console.log('✅ Legacy SMTP delivery successful!');
      console.log(`- Message ID: ${info.messageId}`);
      console.log(`- Test ID: ${testId}`);
      success = true;
      
      return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error('❌ Legacy SMTP delivery failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.response || 'No response details');
      console.error('Error stack:', error.stack);
      
      // Log SMTP configuration
      console.error('- SMTP Configuration:');
      console.error(`  Host: ${process.env.SMTP_HOST}`);
      console.error(`  Port: ${process.env.SMTP_PORT}`);
      console.error(`  User: ${process.env.SMTP_USER}`);
      console.error(`  Secure: ${process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'}`);
      
      // Check for specific error types
      if (error.code === 'EAUTH') {
        console.error('- This appears to be an authentication error');
        console.error('- Check SMTP_USER and SMTP_PASS are correct');
      } else if (error.code === 'ESOCKET') {
        console.error('- This appears to be a connectivity issue');
        console.error('- Check SMTP_HOST and SMTP_PORT are correct');
      } else if (error.code === 'EENVELOPE') {
        console.error('- This appears to be an issue with sender or recipient addresses');
        console.error('- Check that FROM_EMAIL is properly configured');
      }
    }
  } else {
    console.log('⚠️ Legacy SMTP not configured, skipping this step');
  }
  
  // STEP 3: Final verdict
  if (!googleEmailConfigured && !smtpConfigured) {
    console.error('\n❌ CRITICAL ERROR: No email delivery methods configured!');
    console.error('Please configure either Google Email or Legacy SMTP.');
    return { success: false, error: 'NO_METHODS_CONFIGURED' };
  }
  
  if (!success) {
    console.error('\n❌ All email delivery methods failed');
    return { success: false, error: 'ALL_METHODS_FAILED' };
  }
  
  return { success };
}

// Run the test
console.log('\n📋 STARTING EMAIL DELIVERY TEST WITH FALLBACK...');

testEmailWithFallback()
  .then(result => {
    if (result.success) {
      console.log('\n✅ EMAIL TEST SUCCESSFUL!');
      console.log(`- Method used: ${result.method || 'unknown'}`);
      console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      console.log(`- Test ID: ${testId}`);
      console.log(`- Recipient: ${toEmail}`);
      console.log('\nPlease check your email inbox for the test message.');
      
      // Save success report
      const report = `
========================================================
📧 EMAIL DELIVERY TEST WITH FALLBACK - SUCCESS REPORT
🕒 ${new Date().toISOString()}
========================================================

✅ TEST SUMMARY: Email delivery succeeded using ${result.method || 'unknown'} method

📋 EMAIL DETAILS:
- Message ID: ${result.messageId || 'unknown'}
- Test ID: ${testId}
- Recipient: ${toEmail}
- Sent at: ${new Date().toISOString()}

📋 CONFIGURATION:
- Google Email: ${googleEmailConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}
- Legacy SMTP: ${smtpConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}

📋 NEXT STEPS:
- Verify the test email was received by ${toEmail}
- Check spam/junk folders if not found in inbox
- If email was received, email delivery is configured correctly
- The system will automatically use Google Email with fallback to legacy SMTP in production
`;
      
      fs.writeFileSync('email-fallback-test.log', report);
      console.log('📝 Success report saved to email-fallback-test.log');
      
      process.exit(0);
    } else {
      console.error('\n❌ EMAIL TEST FAILED: All delivery methods failed');
      console.error(`Error: ${result.error}`);
      
      // Save failure report
      const report = `
========================================================
📧 EMAIL DELIVERY TEST WITH FALLBACK - FAILURE REPORT
🕒 ${new Date().toISOString()}
========================================================

❌ TEST SUMMARY: Email delivery failed on all methods
Error: ${result.error}

📋 CONFIGURATION:
- Google Email: ${googleEmailConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}
- Legacy SMTP: ${smtpConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}

📋 TROUBLESHOOTING RECOMMENDATIONS:
1. Verify GOOGLE_EMAIL and GOOGLE_EMAIL_PASSWORD are correct
2. Verify SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are correct
3. Check for network connectivity issues or firewalls blocking email ports
4. Try running the Google-only test: node server/scripts/testGoogleEmailDelivery.js
5. Try running the SMTP-only test: node server/scripts/testProductionEmailDelivery.js
`;
      
      fs.writeFileSync('email-fallback-test.log', report);
      console.log('📝 Failure report saved to email-fallback-test.log');
      
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ TEST ERROR:', error);
    process.exit(1);
  });