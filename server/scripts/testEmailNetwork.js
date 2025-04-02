#!/usr/bin/env node
// Direct network connectivity test for SendGrid
// Run with: node server/scripts/testEmailNetwork.js

// This script tests network connectivity to SendGrid services
// It helps diagnose production environment network restrictions

const https = require('https');
const dns = require('dns');
const { promisify } = require('util');
const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
const fromEmail = process.env.FROM_EMAIL || '';

// DNS lookup utility
const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);

// HTTP request utility
async function makeHttpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
  });
}

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Header
console.log(`${colors.blue}${colors.bold}=============================================`);
console.log(`SendGrid Network Connectivity Diagnostic Tool`);
console.log(`=============================================\n${colors.reset}`);

// Config info
console.log(`${colors.bold}Environment Information:${colors.reset}`);
console.log(`• Node.js: ${process.version}`);
console.log(`• Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`• Time: ${new Date().toISOString()}`);
console.log(`• Platform: ${process.platform}`);
console.log(`• SendGrid API Key: ${sendgridApiKey ? `Configured (${sendgridApiKey.substring(0, 7)}...)` : 'Not configured'}`);
console.log(`• From Email: ${fromEmail || 'Not configured'}`);
console.log('');

// Run tests
async function runDiagnostics() {
  const results = {
    dns: { success: false, details: null, error: null },
    connection: { success: false, details: null, error: null },
    api: { success: false, details: null, error: null }
  };
  
  // 1. DNS Resolution Test
  console.log(`${colors.bold}1. DNS Resolution Test${colors.reset}`);
  try {
    console.log('Resolving api.sendgrid.com...');
    const addresses = await dnsResolve4('api.sendgrid.com');
    results.dns.success = true;
    results.dns.details = addresses;
    console.log(`${colors.green}✓ Success: Resolved to ${addresses.join(', ')}${colors.reset}`);
  } catch (error) {
    results.dns.error = error.message;
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}This indicates a DNS resolution problem. Check your network/firewall settings.${colors.reset}`);
  }
  console.log('');
  
  // 2. Basic HTTPS Connection Test
  console.log(`${colors.bold}2. SSL/TLS Connection Test${colors.reset}`);
  try {
    console.log('Testing HTTPS connection to api.sendgrid.com...');
    const connectionTestStart = Date.now();
    const response = await makeHttpRequest({
      host: 'api.sendgrid.com',
      path: '/',
      method: 'HEAD',
      timeout: 5000
    });
    const connectionTime = Date.now() - connectionTestStart;
    
    results.connection.success = true;
    results.connection.details = {
      statusCode: response.statusCode,
      time: connectionTime
    };
    
    console.log(`${colors.green}✓ Success: Connected in ${connectionTime}ms (Status: ${response.statusCode})${colors.reset}`);
  } catch (error) {
    results.connection.error = error.message;
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}This indicates a connection problem. Check your firewall rules for outbound HTTPS traffic.${colors.reset}`);
  }
  console.log('');
  
  // 3. SendGrid API Test (if API key is available)
  console.log(`${colors.bold}3. SendGrid API Test${colors.reset}`);
  if (!sendgridApiKey) {
    console.log(`${colors.yellow}⚠ Skipped: No SendGrid API key configured${colors.reset}`);
  } else {
    try {
      console.log('Testing SendGrid API with credentials...');
      const apiTestStart = Date.now();
      const response = await makeHttpRequest({
        host: 'api.sendgrid.com',
        path: '/v3/user/credits',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'User-Agent': 'SendGrid-Diagnostic-Tool/1.0'
        },
        timeout: 10000
      });
      const apiTime = Date.now() - apiTestStart;
      
      results.api.details = {
        statusCode: response.statusCode,
        time: apiTime,
        response: response.data.substring(0, 100) // Truncate long responses
      };
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        results.api.success = true;
        console.log(`${colors.green}✓ Success: API call succeeded in ${apiTime}ms (Status: ${response.statusCode})${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Failed: API returned status ${response.statusCode}${colors.reset}`);
        console.log(`${colors.yellow}This indicates an authentication or authorization issue with your API key.${colors.reset}`);
      }
    } catch (error) {
      results.api.error = error.message;
      console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}This indicates a connectivity issue or API problem.${colors.reset}`);
    }
  }
  console.log('');
  
  // Summary
  console.log(`${colors.blue}${colors.bold}=================`);
  console.log(`Diagnostic Summary`);
  console.log(`=================${colors.reset}\n`);
  
  const allSuccess = results.dns.success && results.connection.success && (results.api.success || !sendgridApiKey);
  
  if (allSuccess) {
    console.log(`${colors.green}${colors.bold}✓ All tests passed. Network connectivity to SendGrid appears to be working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}✗ Some tests failed. There may be network connectivity issues to SendGrid.${colors.reset}`);
    
    console.log('\nRecommended actions:');
    if (!results.dns.success) {
      console.log(`${colors.yellow}• Check DNS resolution in your environment`);
      console.log(`• Ensure your network can resolve external domains`);
      console.log(`• Try setting explicit DNS servers if needed`);
    }
    
    if (!results.connection.success) {
      console.log(`${colors.yellow}• Check firewall rules for outbound HTTPS traffic`);
      console.log(`• Verify outbound traffic to port 443 is allowed`);
      console.log(`• Check for SSL/TLS inspection that might be interfering`);
    }
    
    if (sendgridApiKey && !results.api.success) {
      console.log(`${colors.yellow}• Verify your SendGrid API key is valid and has mail.send permission`);
      console.log(`• Check if your SendGrid account is active and in good standing`);
      console.log(`• Verify your sender domain is properly verified in SendGrid`);
    }
  }
  
  return results;
}

// Run the diagnostics
runDiagnostics()
  .then(() => {
    console.log(`\n${colors.cyan}For additional assistance, create a support ticket with SendGrid including these diagnostic results.${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unexpected error running diagnostics: ${error.message}${colors.reset}`);
    process.exit(1);
  });