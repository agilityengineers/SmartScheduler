/**
 * Production Email Test - CommonJS
 * 
 * This script simulates a production environment and tests the email configuration.
 * It uses CommonJS syntax for compatibility with all environments.
 */

// Load environment variables
require('dotenv').config();
const nodemailer = require('nodemailer');

// First, clear any existing environment variables to simulate a clean slate
delete process.env.FROM_EMAIL;
delete process.env.SMTP_HOST;
delete process.env.SMTP_PORT;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.SMTP_SECURE;

// Set up production environment manually for testing
process.env.NODE_ENV = 'production';
process.env.FROM_EMAIL = 'noreply@smart-scheduler.ai';
process.env.SMTP_HOST = 'server.pushbutton-hosting.com';
process.env.SMTP_PORT = '465';
process.env.SMTP_USER = 'app@smart-scheduler.ai';
process.env.SMTP_SECURE = 'true';

// Get password from command line or use default for testing
if (process.argv.length > 2) {
  process.env.SMTP_PASS = process.argv[2];
} else {
  // Will not work without proper password, Replit secrets should be used in production
  process.env.SMTP_PASS = '';
  console.warn('⚠️ No password provided! Use: node test-production-email.cjs YOUR_PASSWORD');
}

// Create a test function
async function testEmailInProduction() {
  console.log('=== Production Email Configuration Test ===');
  
  // Report configuration
  console.log('\n=== Environment Configuration ===');
  console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '[Set]' : '[Not Set]'}`);
  console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE}`);
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Verify connection
    console.log('\n=== Testing SMTP Connection ===');
    const connectionVerified = await transporter.verify();
    console.log(`Connection verified: ${connectionVerified ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    
    if (!connectionVerified) {
      throw new Error('Failed to connect to SMTP server');
    }
    
    // Get test recipient from command line or use default
    const testEmailTo = process.argv.length > 3 ? process.argv[3] : 'test@example.com';
    
    // Send a test email
    console.log(`\n=== Sending Test Email to ${testEmailTo} ===`);
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: testEmailTo,
      subject: 'Production Email Test',
      text: `This is a test email sent at ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Production Email Test</h2>
          <p>This email confirms that your production email configuration is working correctly.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> ${process.env.SMTP_HOST}</p>
        </div>
      `
    });
    
    console.log('\n✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`Server response: ${error.response}`);
    }
    
    return false;
  }
}

// Run the test
testEmailInProduction().then(success => {
  if (success) {
    console.log('\n✅ Production email configuration is working!');
    console.log('The email system should work correctly in production.');
    process.exit(0);
  } else {
    console.error('\n❌ Production email configuration test failed.');
    console.error('Check the error messages above for details.');
    process.exit(1);
  }
});