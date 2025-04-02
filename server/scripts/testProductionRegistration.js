/**
 * This script tests user registration in a production-like environment
 * It simulates the production email verification flow
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Override environment to simulate production
process.env.NODE_ENV = 'production';

// Generate a unique test user email
const timestamp = Date.now();
const testEmail = `test_user_${timestamp}@example.com`;
const testPassword = 'Test@12345';
const testUsername = `test_user_${timestamp}`;

async function testRegistration() {
  console.log('\n🧪 TESTING PRODUCTION USER REGISTRATION FLOW');
  console.log('===========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Test Email: ${testEmail}`);
  console.log(`Test Username: ${testUsername}`);
  
  try {
    // Step 1: Register the test user
    console.log('\n📝 Step 1: Registering test user...');
    
    const registerResponse = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        name: 'Test User',
        role: 'user'
      })
    });
    
    const registerData = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.error('❌ Registration failed:', registerData.message || 'Unknown error');
      return;
    }
    
    console.log('✅ Registration successful');
    console.log('- User created with ID:', registerData.userId);
    
    // Optional: Pause to wait for email to be sent (for debugging)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Note: In production, we can't access the verification token directly
    // This is where we would need to check the email inbox
    // For testing purposes, we can check if the email service logged success
    
    console.log('\n📧 Step 2: Verification email details:');
    console.log('- Check server logs for email delivery confirmation');
    console.log('- In a real production test, check the inbox for the test email');
    
    // For development purposes, let's provide instructions on how to verify
    console.log('\n🔍 Step 3: Verification process simulation:');
    console.log('- In production, click the verification link sent to the email');
    console.log('- For testing: Manually check server logs for email delivery success/failure');
    console.log('- Look for logs showing "✅ Email delivery successful through at least one method"');
    
    return {
      success: true,
      email: testEmail,
      username: testUsername,
      message: 'Test registration completed. Check server logs for email results.'
    };
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testRegistration()
  .then(result => {
    console.log('\n📊 TEST RESULTS:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });