// Test script for production registration flow
import axios from 'axios';
import * as fs from 'fs';

/**
 * Tests the complete registration flow in a production environment
 * This test will:
 * 1. Register a test user
 * 2. Verify the API responds correctly
 * 3. Check if verification email would be sent
 */
async function testProductionRegistration() {
  console.log('🔍 TESTING PRODUCTION REGISTRATION FLOW');
  console.log('======================================');
  
  // Configuration 
  const API_BASE_URL = process.env.BASE_URL || 'https://mysmartscheduler.co';
  const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
  const TEST_USERNAME = `testuser_${new Date().getTime().toString().slice(-6)}`;
  const TEST_PASSWORD = 'Password123!';
  
  console.log(`\n📋 TEST CONFIGURATION:`);
  console.log(`- API URL: ${API_BASE_URL}`);
  console.log(`- Test Email: ${TEST_EMAIL}`);
  console.log(`- Test Username: ${TEST_USERNAME}`);
  console.log(`- Test Password: [hidden]`);
  
  // 1. Test registration endpoint
  console.log(`\n🔄 Step 1: Testing Registration API`);
  const registerUrl = `${API_BASE_URL}/api/auth/register`;
  console.log(`POST ${registerUrl}`);
  
  try {
    // Save state for debugging
    const testState = {
      timestamp: new Date().toISOString(),
      configuration: {
        apiUrl: API_BASE_URL,
        testEmail: TEST_EMAIL,
        testUsername: TEST_USERNAME
      },
      steps: []
    };
    
    // Make registration request
    const response = await axios.post(registerUrl, {
      email: TEST_EMAIL,
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Registration API responded with status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data, null, 2));
    
    testState.steps.push({
      name: 'registration',
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      response: response.data
    });
    
    // 2. Check the response for success
    let registrationSuccessful = false;
    
    if (response.status >= 200 && response.status < 300) {
      if (response.data && response.data.message && response.data.message.includes('verification')) {
        console.log('✅ Registration successful! Verification email should be sent.');
        registrationSuccessful = true;
      } else if (response.data && response.data.success === true) {
        console.log('✅ Registration successful!');
        registrationSuccessful = true;
      } else if (response.data && response.data.error && response.data.error.includes('already exists')) {
        console.log('⚠️ User already exists. This is expected if you run the test multiple times.');
        console.log('You can change TEST_EMAIL or TEST_USERNAME to test with a new user.');
      } else {
        console.log('⚠️ Registration API returned success status but with unexpected response format.');
      }
    } else {
      console.error('❌ Registration failed with status:', response.status);
    }
    
    // 3. Try logging in with the new credentials to verify
    if (registrationSuccessful) {
      console.log(`\n🔄 Step 3: Attempting login to verify user creation`);
      const loginUrl = `${API_BASE_URL}/api/login`;
      console.log(`POST ${loginUrl}`);
      
      try {
        const loginResponse = await axios.post(loginUrl, {
          username: TEST_USERNAME,
          password: TEST_PASSWORD
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        testState.steps.push({
          name: 'login',
          success: loginResponse.status >= 200 && loginResponse.status < 300,
          statusCode: loginResponse.status,
          response: loginResponse.data
        });
        
        console.log(`✅ Login API responded with status: ${loginResponse.status}`);
        
        // Check for email verification status in login response
        if (loginResponse.data && loginResponse.data.emailVerificationStatus === false) {
          console.log('✅ Account created successfully but email is not verified as expected.');
          console.log('A verification email should have been sent to:', TEST_EMAIL);
          
          // We expect to see email verification required message
          if (loginResponse.data.message && loginResponse.data.message.includes('verification')) {
            console.log('✅ Login response correctly indicates email verification required.');
          }
        } else if (loginResponse.status === 401) {
          console.log('⚠️ Login failed with unauthorized status. This could be because:');
          console.log('- Email verification is required before login is allowed');
          console.log('- User was not created properly');
        } else {
          console.log('⚠️ Login successful but unexpected response format for email verification.');
        }
      } catch (loginError) {
        console.error('❌ Login attempt failed:', loginError.message);
        
        if (loginError.response) {
          console.log(`Status: ${loginError.response.status}`);
          console.log(`Response:`, JSON.stringify(loginError.response.data, null, 2));
          
          testState.steps.push({
            name: 'login',
            success: false,
            statusCode: loginError.response.status,
            response: loginError.response.data,
            error: loginError.message
          });
          
          // If 401 unauthorized, this might be because email verification is required
          if (loginError.response.status === 401) {
            console.log('⚠️ Login rejected as expected because email verification is required.');
            
            if (loginError.response.data && 
                loginError.response.data.message && 
                loginError.response.data.message.includes('verification')) {
              console.log('✅ Server correctly indicates email verification needed.');
            }
          }
        } else {
          testState.steps.push({
            name: 'login',
            success: false,
            error: loginError.message
          });
        }
      }
    }
    
    // 4. Analyze results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('============================');
    
    if (registrationSuccessful) {
      console.log('✅ Registration endpoint is functioning correctly.');
      console.log('✅ A verification email should have been sent to:', TEST_EMAIL);
      console.log('\nWhat to check next:');
      console.log('1. Check the email inbox for:', TEST_EMAIL);
      console.log('2. Look for an email with subject "Verify Your Email Address"');
      console.log('3. Check server logs for any email delivery errors');
      console.log('\nIf no email was received:');
      console.log('- Check server logs for SMTP errors');
      console.log('- Verify SMTP settings are correct');
      console.log('- Run the email diagnostic script to test email delivery');
    } else {
      console.log('❌ Registration test failed.');
      console.log('Check the error details above and server logs for more information.');
    }
    
    // Save test results to a file for debugging
    const resultsFile = `registration_test_${new Date().getTime()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(testState, null, 2));
    console.log(`\nDetailed test results saved to: ${resultsFile}`);
    
  } catch (error) {
    console.error('❌ Registration test failed with error:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400 && 
          error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('already exists')) {
        console.log('\n💡 User already exists. This is expected if you run the test multiple times.');
        console.log('You can change TEST_EMAIL or TEST_USERNAME to test with a new user.');
      }
    }
    
    console.log('\n💡 TROUBLESHOOTING TIPS:');
    console.log('- Check the server logs for detailed error messages');
    console.log('- Verify the API URL is correct:', API_BASE_URL);
    console.log('- Ensure the server is running and accessible');
    console.log('- Check for any network issues or firewall restrictions');
  }
}

testProductionRegistration().catch(console.error);