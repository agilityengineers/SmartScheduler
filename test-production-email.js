import * as dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

async function testProductionEmail() {
  console.log('\n🔍 PRODUCTION EMAIL TEST');
  console.log('=========================');
  
  // Get the environment variables
  const googleEmail = process.env.GOOGLE_EMAIL;
  const googleEmailPassword = process.env.GOOGLE_EMAIL_PASSWORD;
  const googleEmailName = process.env.GOOGLE_EMAIL_NAME || 'SmartScheduler';
  
  console.log('\n📧 Email Configuration:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- BASE_URL: ${process.env.BASE_URL || 'not set'}`);
  console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL || 'not set'}`);
  console.log(`- GOOGLE_EMAIL: ${googleEmail ? googleEmail : 'not set'}`);
  console.log(`- GOOGLE_EMAIL_PASSWORD: ${googleEmailPassword ? '[set]' : '[not set]'}`);
  console.log(`- GOOGLE_EMAIL_NAME: ${googleEmailName}`);
  
  // Check if Google email is configured
  if (!googleEmail || !googleEmailPassword) {
    console.error('❌ Google Email is not properly configured!');
    console.error('Please set GOOGLE_EMAIL and GOOGLE_EMAIL_PASSWORD in your environment variables.');
    return;
  }
  
  console.log('\n🔄 Creating email transport...');
  
  try {
    // Create transport
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: googleEmail,
        pass: googleEmailPassword
      }
    });
    
    console.log('✅ Transport created');
    console.log('\n🔄 Verifying connection...');
    
    // Verify connection
    await transport.verify();
    console.log('✅ Connection verified successfully');
    
    // Get test recipient
    const testEmail = process.argv[2] || 'emailme@clarencewilliams.com';
    console.log(`\n🔄 Sending test email to ${testEmail}...`);
    
    // Send test email
    const info = await transport.sendMail({
      from: `"${googleEmailName}" <${googleEmail}>`,
      to: testEmail,
      subject: 'Test Email from Production Environment',
      text: 'This is a test email from the production environment to verify email delivery.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4a90e2;">Production Email Test</h2>
          <p>This is a test email from the production environment to verify email delivery.</p>
          <p>If you received this email, it confirms that the email service is working correctly.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">This is an automated test email. Please do not reply.</p>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`📨 Delivered to: ${testEmail}`);
    
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error(error);
    
    // Detailed error diagnostics
    console.log('\n🔍 DETAILED ERROR DIAGNOSTICS:');
    console.log('- Error name:', error.name);
    console.log('- Error message:', error.message);
    console.log('- Error code:', error.code || 'N/A');
    console.log('- Error command:', error.command || 'N/A');
    
    if (error.code === 'EAUTH') {
      console.log('\n❗ AUTHENTICATION FAILURE:');
      console.log('The email provider rejected your credentials. Please check:');
      console.log('1. Your email and password are correct');
      console.log('2. You have enabled "Less secure app access" or created an App Password');
      console.log('3. You are not being blocked by captcha (try signing in to Gmail manually first)');
    }
    
    if (error.code === 'ESOCKET') {
      console.log('\n❗ NETWORK/SOCKET ERROR:');
      console.log('There was a problem connecting to the email server. Please check:');
      console.log('1. Your network connection');
      console.log('2. Any firewalls or network restrictions');
    }
  }
}

testProductionEmail();