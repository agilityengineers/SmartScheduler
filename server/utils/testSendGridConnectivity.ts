import fetch from 'node-fetch';

/**
 * Tests network connectivity to various SendGrid API endpoints to verify
 * if the production environment can reach SendGrid properly
 */
export async function testSendGridConnectivity(): Promise<{
  success: boolean;
  results: Record<string, any>;
  errors: Record<string, any>;
}> {
  const results: Record<string, any> = {};
  const errors: Record<string, any> = {};
  let overallSuccess = true;
  
  // Test endpoints
  const endpoints = [
    { 
      name: 'ping',
      url: 'https://api.sendgrid.com/v3/user/credits', 
      method: 'GET',
      description: 'Basic API connectivity check'
    },
    {
      name: 'dns',
      url: 'https://sendgrid.api.sendgrid.com',
      method: 'GET',
      description: 'DNS resolution test'
    },
    {
      name: 'mail_send',
      url: 'https://api.sendgrid.com/v3/mail/send',
      method: 'OPTIONS',
      description: 'Mail sending endpoint check'
    }
  ];
  
  // Perform network diagnostic tests
  console.log('🔍 Testing network connectivity to SendGrid services...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint.name} (${endpoint.url})`);
      
      // Basic connectivity test (don't send actual requests with API key)
      const connectTest = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'User-Agent': 'SmartScheduler-DiagnosticTool/1.0'
        }
      });
      
      // Store results
      results[endpoint.name] = {
        status: connectTest.status,
        statusText: connectTest.statusText,
        headers: Object.fromEntries(connectTest.headers.entries()),
        endpoint: endpoint.url
      };
      
      console.log(`✅ Endpoint ${endpoint.name} is reachable. Status: ${connectTest.status}`);
    } catch (error: any) {
      overallSuccess = false;
      console.error(`❌ Failed to connect to ${endpoint.name}: ${error.message}`);
      
      // Store error information
      errors[endpoint.name] = {
        message: error.message,
        code: error.code,
        type: error.type || typeof error,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      };
    }
  }
  
  // DNS lookup test
  try {
    console.log('Performing DNS lookup for api.sendgrid.com...');
    const dns = require('dns');
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4('api.sendgrid.com', (err: Error | null, addresses: string[]) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    results['dns_lookup'] = {
      addresses,
      success: true
    };
    
    console.log(`✅ DNS lookup successful. Resolved to: ${addresses.join(', ')}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ DNS lookup failed: ${error.message}`);
    errors['dns_lookup'] = {
      message: error.message,
      code: error.code
    };
  }
  
  // SSL/TLS Validation
  try {
    console.log('Testing SSL/TLS handshake with api.sendgrid.com...');
    const https = require('https');
    
    const tlsCheck = await new Promise<any>((resolve, reject) => {
      const req = https.request({
        host: 'api.sendgrid.com',
        port: 443,
        method: 'HEAD',
        timeout: 5000
      }, (res: any) => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          authorized: res.socket.authorized,
          authorizationError: res.socket.authorizationError || null,
          cipher: res.socket.getCipher()
        });
        res.on('data', () => {}); // Consume data
        req.end();
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
      
      req.end();
    });
    
    results['tls_check'] = tlsCheck;
    console.log(`✅ SSL/TLS connection successful. Cipher: ${tlsCheck.cipher?.name}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ SSL/TLS connection failed: ${error.message}`);
    errors['tls_check'] = {
      message: error.message,
      code: error.code
    };
  }
  
  // Report overall status
  console.log(`SendGrid connectivity tests ${overallSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  return {
    success: overallSuccess,
    results,
    errors
  };
}

// Export a function to run the test
export async function runNetworkDiagnostics() {
  console.log('📡 Running SendGrid network diagnostics...');
  console.log('📝 Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('📝 Server time: ' + new Date().toISOString());
  
  try {
    const results = await testSendGridConnectivity();
    
    console.log('\n==== DIAGNOSTICS SUMMARY ====');
    console.log(`Overall connectivity: ${results.success ? 'GOOD ✓' : 'ISSUES DETECTED ✗'}`);
    
    if (!results.success) {
      console.log('\n⚠️ Network connectivity issues detected:');
      Object.entries(results.errors).forEach(([key, error]: [string, any]) => {
        console.log(`- ${key}: ${error.message}`);
      });
      
      console.log('\n🔧 Recommended actions:');
      console.log('1. Check if outbound HTTPS connections are allowed in your production environment');
      console.log('2. Verify if any proxy settings are required for your network');
      console.log('3. Confirm that api.sendgrid.com is not blocked by any firewall');
      console.log('4. Make sure your DNS resolution is working correctly');
    }
    
    return results;
  } catch (error) {
    console.error('Failed to run network diagnostics:', error);
    return {
      success: false,
      results: {},
      errors: { main: { message: String(error) } }
    };
  }
}