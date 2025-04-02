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
    // Changed from OPTIONS which was causing Duplicate Content-Length errors
    {
      name: 'mail_send',
      url: 'https://api.sendgrid.com/v3/mail/send',
      method: 'HEAD', // Use HEAD instead of OPTIONS to avoid the Parse Error
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
    
    // Use fetch API instead of DNS module to check connectivity
    const dnsCheckResult = await fetch('https://api.sendgrid.com', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'SmartScheduler-DiagnosticTool/1.0'
      }
    });
    
    results['dns_lookup'] = {
      status: dnsCheckResult.status,
      statusText: dnsCheckResult.statusText,
      success: true
    };
    
    console.log(`✅ DNS lookup successful. Status: ${dnsCheckResult.status}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ DNS lookup failed: ${error.message}`);
    errors['dns_lookup'] = {
      message: error.message,
      code: error.code || 'NETWORK_ERROR'
    };
  }
  
  // SSL/TLS Validation - use fetch API instead of HTTPS module
  try {
    console.log('Testing SSL/TLS handshake with api.sendgrid.com...');
    
    const tlsResponse = await fetch('https://api.sendgrid.com', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'SmartScheduler-DiagnosticTool/1.0'
      }
    });
    
    const tlsCheck = {
      statusCode: tlsResponse.status,
      statusText: tlsResponse.statusText,
      headers: Object.fromEntries(tlsResponse.headers.entries()),
      success: true
    };
    
    results['tls_check'] = tlsCheck;
    console.log(`✅ SSL/TLS connection successful. Status: ${tlsResponse.status}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ SSL/TLS connection failed: ${error.message}`);
    errors['tls_check'] = {
      message: error.message,
      code: error.code || 'NETWORK_ERROR'
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

// Check SendGrid API Key permissions
export async function checkApiKey() {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    return {
      keyIsValid: false,
      permissions: [],
      hasMailSendPermission: false,
      message: 'SendGrid API key is not configured'
    };
  }
  
  try {
    console.log('Checking SendGrid API key permissions...');
    
    // Call the scopes endpoint to check permissions
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const scopes = data.scopes || [];
      
      // Check if mail.send permission is present
      const hasMailSendPermission = scopes.includes('mail.send');
      
      console.log('SendGrid API key permissions:', { scopes });
      console.log('SendGrid API key has mail.send permission:', hasMailSendPermission);
      
      return {
        keyIsValid: true,
        permissions: scopes,
        hasMailSendPermission,
        message: 'API key is valid'
      };
    } else {
      console.error('SendGrid API key validation failed:', response.status, response.statusText);
      
      return {
        keyIsValid: false,
        permissions: [],
        hasMailSendPermission: false,
        message: `Invalid API key (Status: ${response.status})`
      };
    }
  } catch (error) {
    console.error('Error validating SendGrid API key:', error);
    
    return {
      keyIsValid: false,
      permissions: [],
      hasMailSendPermission: false,
      message: `Error validating API key: ${(error as Error).message}`
    };
  }
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