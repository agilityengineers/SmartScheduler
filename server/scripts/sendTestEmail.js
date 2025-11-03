/**
 * Simple test script to send an email via SendGrid
 */

import { emailService } from '../utils/emailService.js';

const testEmail = 'emailme@clarencewilliams.com';

console.log('='.repeat(60));
console.log('📧 SENDGRID EMAIL TEST');
console.log('='.repeat(60));
console.log(`Sending test email to: ${testEmail}`);
console.log(`From: ${emailService.getFromEmail()}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`SendGrid configured: ${!!process.env.SENDGRID_API_KEY ? 'Yes ✓' : 'No ✗'}`);
console.log('='.repeat(60));
console.log('');

async function sendTest() {
  try {
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'SmartScheduler - SendGrid Test Email',
      text: `This is a test email from SmartScheduler to verify that SendGrid email delivery is working correctly.\n\nSent at: ${new Date().toISOString()}\n\nIf you received this, SendGrid is configured and working!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <div style="background-color: #4a86e8; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">SmartScheduler</h1>
            <p style="color: #ffffff; margin: 5px 0 0 0;">SendGrid Test Email</p>
          </div>

          <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">✅ Email Delivery Test</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              This is a test email from <strong>SmartScheduler</strong> to verify that SendGrid email delivery is working correctly.
            </p>

            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #4a86e8; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Test Details:</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">Time sent: ${new Date().toISOString()}</p>
              <p style="margin: 5px 0 0 0; color: #666;">Delivery method: SendGrid API</p>
            </div>

            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                <strong>✓ Success!</strong> If you received this email, SendGrid is configured and working correctly.
              </p>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This is an automated test message from SmartScheduler
            </p>
          </div>
        </div>
      `
    });

    console.log('');
    console.log('='.repeat(60));
    if (result.success) {
      console.log('✅ SUCCESS! Email sent successfully');
      console.log('='.repeat(60));
      console.log(`Message ID: ${result.messageId || 'N/A'}`);
      console.log(`Delivery method: ${result.method || 'sendgrid'}`);
      console.log('');
      console.log('📬 Check your inbox at: ' + testEmail);
      console.log('   (Also check spam/junk folder if not in inbox)');
    } else {
      console.log('❌ FAILED! Email was not sent');
      console.log('='.repeat(60));
      console.log('Error:', result.error?.message || 'Unknown error');
      console.log('Code:', result.error?.code || 'N/A');
      if (result.error?.details) {
        console.log('Details:', result.error.details);
      }
    }
    console.log('='.repeat(60));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ EXCEPTION! Unexpected error occurred');
    console.log('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

sendTest();
