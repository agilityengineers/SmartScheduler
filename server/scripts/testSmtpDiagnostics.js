/**
 * Standalone SMTP Diagnostics Script
 * 
 * This script can be run directly with Node.js to test SMTP connectivity
 * without needing to start the full application.
 * 
 * Usage: node server/scripts/testSmtpDiagnostics.js
 */

import { runSmtpDiagnostics } from '../utils/testSmtpDiagnostics.js';

console.log('=== SMTP Connection Diagnostics ===');
console.log('This script tests connectivity to your SMTP server configuration');
console.log('It will check DNS resolution, TCP connection, and authentication');
console.log('');

runSmtpDiagnostics()
  .then(result => {
    console.log('\n==== DETAILED RESULTS ====');
    
    if (result.success) {
      console.log('✅ All SMTP tests completed successfully!');
    } else {
      console.log('❌ Some SMTP tests failed.');
      
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.log('\nErrors encountered:');
        Object.entries(result.errors).forEach(([key, error]) => {
          console.log(`- ${key}: ${error.message}`);
        });
      }
      
      if (result.productionIssues && result.productionIssues.length > 0) {
        console.log('\nPotential production issues:');
        result.productionIssues.forEach((issue, i) => {
          console.log(`${i+1}. ${issue}`);
        });
      }
    }
    
    console.log('\nDetailed test results:');
    Object.entries(result.results).forEach(([test, passed]) => {
      console.log(`- ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    });
    
    console.log('\nRecommended next steps:');
    if (result.success) {
      console.log('✓ Your SMTP configuration looks good! You should be able to send emails successfully.');
      console.log('✓ Test sending an actual email by registering a new user or using the email test feature.');
    } else {
      console.log('✗ Review the errors above and fix your SMTP configuration.');
      console.log('✗ Check that the SMTP host, port, username, password, and security settings are correct.');
      console.log('✗ Ensure that your FROM_EMAIL domain has proper DNS records (MX, SPF, DMARC).');
    }
  })
  .catch(error => {
    console.error('Failed to run diagnostics:', error);
  });