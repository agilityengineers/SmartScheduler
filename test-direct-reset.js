/**
 * Direct test script to trigger password reset from the backend
 * This simulates the API call without having to go through the frontend
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

async function testDirectReset() {
  console.log('🔄 TESTING DIRECT PASSWORD RESET API CALL');

  // Target the problematic user
  const userEmail = 'emailme@clarencewilliams.com';
  console.log(`📧 Target email: ${userEmail}`);

  // Use curl to directly call the API
  const curlCommand = `curl -X POST http://localhost:5000/api/reset-password/request \
    -H "Content-Type: application/json" \
    -d '{"email":"${userEmail}"}' \
    --verbose`;

  console.log(`\n💻 Executing command:\n${curlCommand}\n`);

  try {
    const { stdout, stderr } = await execPromise(curlCommand);
    
    console.log('📤 API Response:');
    console.log(stdout);
    
    if (stderr) {
      console.log('⚠️ API Request Details:');
      console.log(stderr);
    }
    
    console.log('\n✅ TEST COMPLETED - Check server logs for details on email delivery');
    return true;
  } catch (error) {
    console.error('❌ Error executing API request:', error.message);
    if (error.stdout) console.log('API Response:', error.stdout);
    if (error.stderr) console.log('Request Details:', error.stderr);
    return false;
  }
}

// Run the test
testDirectReset()
  .then(success => {
    console.log(`\n${success ? '✅ Test completed successfully' : '❌ Test failed'}`);
    // Don't exit - let's see the logs from the server
  })
  .catch(error => {
    console.error('Unhandled error:', error);
  });