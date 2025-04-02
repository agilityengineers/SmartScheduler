// Test script for email verification flow
import { emailService } from '../utils/emailService.js';
import { emailVerificationService } from '../utils/emailVerificationUtils.js';

async function testVerificationEmail() {
  console.log('🔍 Testing email verification flow...');
  
  // Generate a fake verification token
  const userId = 1;
  const email = 'test@example.com';
  
  console.log(`Generating verification token for user ${userId} (${email})...`);
  const token = emailVerificationService.generateToken(userId, email);
  console.log(`Generated token: ${token}`);
  
  // Create verification link (using the same construction as in routes.ts)
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const verifyLink = `${baseUrl}/verify-email?token=${token}`;
  console.log(`Verification link: ${verifyLink}`);
  
  // Send verification email using the emailService
  console.log(`Sending verification email to ${email}...`);
  try {
    const result = await emailService.sendEmailVerificationEmail(email, verifyLink);
    
    console.log('📧 Email verification result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Verification email sent successfully!');
      if (result.method === 'ethereal') {
        console.log('📝 Since this is in development mode, the email was sent to an Ethereal test account.');
        console.log('You can view the email at the message preview URL shown in the logs above.');
      }
    } else {
      console.error('❌ Failed to send verification email.');
      console.error('Error details:', result.error);
    }
  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

// Run the test
testVerificationEmail().catch(console.error);