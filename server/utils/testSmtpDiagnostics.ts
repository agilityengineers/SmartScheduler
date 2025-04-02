import nodemailer from 'nodemailer';
import dns from 'dns';
import util from 'util';
import net from 'net';

// Convert DNS lookup to Promise
const dnsLookup = util.promisify(dns.lookup);

/**
 * Tests network connectivity to validate SMTP server configuration and connectivity
 */
export async function testSmtpConnectivity(): Promise<{
  success: boolean;
  results: Record<string, any>;
  errors: Record<string, any>;
  productionIssues?: string[];
}> {
  const results: Record<string, any> = {};
  const errors: Record<string, any> = {};
  let overallSuccess = true;
  
  // Get SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  // DNS resolution test
  try {
    if (!smtpHost) {
      throw new Error('SMTP_HOST is not configured');
    }
    
    console.log(`Testing DNS resolution for ${smtpHost}...`);
    const { address } = await dnsLookup(smtpHost);
    
    results['dns_lookup'] = {
      host: smtpHost,
      resolvedIp: address,
      success: true
    };
    
    console.log(`✅ DNS resolution successful. Resolved to: ${address}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ DNS resolution failed: ${error.message}`);
    errors['dns_lookup'] = {
      message: error.message,
      code: error.code || 'DNS_ERROR'
    };
  }
  
  // TCP connection test
  try {
    if (!smtpHost || !smtpPort) {
      throw new Error('SMTP_HOST or SMTP_PORT is not configured');
    }
    
    console.log(`Testing TCP connection to ${smtpHost}:${smtpPort}...`);
    
    // Create a socket and attempt to connect
    const socket = new net.Socket();
    
    const connectionPromise = new Promise<void>((resolve, reject) => {
      // Set connection timeout to 5 seconds
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        socket.end();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        reject(err);
      });
      
      socket.connect(smtpPort, smtpHost);
    });
    
    await connectionPromise;
    
    results['tcp_connection'] = {
      host: smtpHost,
      port: smtpPort,
      success: true
    };
    
    console.log(`✅ TCP connection successful to ${smtpHost}:${smtpPort}`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ TCP connection failed: ${error.message}`);
    errors['tcp_connection'] = {
      message: error.message,
      code: error.code || 'CONNECTION_ERROR'
    };
  }
  
  // SMTP Authentication test
  try {
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration is incomplete');
    }
    
    console.log(`Testing SMTP authentication on ${smtpHost}:${smtpPort}...`);
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000, // 10 seconds
      tls: {
        rejectUnauthorized: false // Don't fail on invalid certs for testing
      }
    });
    
    // Verify the connection
    await transporter.verify();
    
    results['smtp_auth'] = {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      success: true
    };
    
    console.log(`✅ SMTP authentication successful`);
  } catch (error: any) {
    overallSuccess = false;
    console.error(`❌ SMTP authentication failed: ${error.message}`);
    errors['smtp_auth'] = {
      message: error.message,
      code: error.code || 'AUTH_ERROR'
    };
  }
  
  // Domain DNS record check (MX, SPF, DMARC)
  try {
    // Determine the email domain to check
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
    const emailDomain = fromEmail.includes('@') ? 
      fromEmail.split('@')[1] : 
      fromEmail.replace(/^@/, '');
      
    console.log(`Checking DNS records for email domain: ${emailDomain}...`);
    
    // Check MX records
    const resolveMx = util.promisify(dns.resolveMx);
    const mxRecords = await resolveMx(emailDomain).catch(() => []);
    
    // Check TXT records for SPF and DMARC
    const resolveTxt = util.promisify(dns.resolveTxt);
    const txtRecords = await resolveTxt(emailDomain).catch(() => []);
    
    // Check DMARC record
    const dmarcRecords = await resolveTxt(`_dmarc.${emailDomain}`).catch(() => []);
    
    // Format and filter records
    const formattedTxtRecords = txtRecords
      .flat()
      .filter(record => record.includes('v=spf1'));
      
    const formattedDmarcRecords = dmarcRecords
      .flat()
      .filter(record => record.includes('v=DMARC1'));
    
    results['domain_dns'] = {
      domain: emailDomain,
      mxRecords: mxRecords.length > 0,
      spfRecords: formattedTxtRecords.length > 0,
      dmarcRecords: formattedDmarcRecords.length > 0,
      success: mxRecords.length > 0
    };
    
    if (mxRecords.length > 0) {
      console.log(`✅ Found ${mxRecords.length} MX records for ${emailDomain}`);
    } else {
      console.warn(`⚠️ No MX records found for ${emailDomain}`);
    }
    
    if (formattedTxtRecords.length > 0) {
      console.log(`✅ Found SPF record for ${emailDomain}`);
    } else {
      console.warn(`⚠️ No SPF record found for ${emailDomain}`);
    }
    
    if (formattedDmarcRecords.length > 0) {
      console.log(`✅ Found DMARC record for ${emailDomain}`);
    } else {
      console.warn(`⚠️ No DMARC record found for ${emailDomain}`);
    }
  } catch (error: any) {
    // Don't fail the overall test for this
    console.error(`❌ Domain DNS check failed: ${error.message}`);
    results['domain_dns'] = {
      error: error.message,
      success: false
    };
  }
  
  // Report overall status
  console.log(`SMTP connectivity tests ${overallSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  return {
    success: overallSuccess,
    results,
    errors,
    productionIssues: []
  };
}

// Export a function to run all diagnostic tests
export async function runSmtpDiagnostics() {
  console.log('📡 Running SMTP diagnostics...');
  console.log('📝 Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('📝 Server time: ' + new Date().toISOString());
  
  try {
    const results = await testSmtpConnectivity();
    const productionIssues: string[] = [];
    
    // Check for production-specific configuration issues
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Running production environment specific tests...');
      
      // Check if FROM_EMAIL is properly configured
      if (!process.env.FROM_EMAIL || process.env.FROM_EMAIL.startsWith('@')) {
        console.log('⚠️ FROM_EMAIL issue detected in production environment');
        productionIssues.push(
          'FROM_EMAIL is not properly configured or starts with @ - needs proper format in production'
        );
      }
      
      // Check if SMTP is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        productionIssues.push(
          'SMTP configuration is incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS'
        );
      }
      
      // Domain verification reminders
      const emailDomain = process.env.FROM_EMAIL ? 
        (process.env.FROM_EMAIL.includes('@') ? process.env.FROM_EMAIL.split('@')[1] : process.env.FROM_EMAIL.replace(/^@/, '')) : 
        'mysmartscheduler.co';
        
      console.log(`🔍 Checking domain configuration for: ${emailDomain}`);
      
      // Recommend DNS record checks
      if (results.results.domain_dns && !results.results.domain_dns.mxRecords) {
        productionIssues.push(
          `Domain "${emailDomain}" is missing MX records which are required for receiving email`
        );
      }
      
      if (results.results.domain_dns && !results.results.domain_dns.spfRecords) {
        productionIssues.push(
          `Domain "${emailDomain}" is missing SPF records which helps prevent emails from being marked as spam`
        );
      }
      
      if (results.results.domain_dns && !results.results.domain_dns.dmarcRecords) {
        productionIssues.push(
          `Domain "${emailDomain}" is missing DMARC records which improves email deliverability`
        );
      }
      
      // Recommend other production settings
      productionIssues.push(
        'Make sure your SMTP server allows outbound connections from your production server IP'
      );
      
      productionIssues.push(
        'Check if production environment has outbound email filtering or SMTP blocking'
      );
    }
    
    console.log('\n==== DIAGNOSTICS SUMMARY ====');
    console.log(`Overall connectivity: ${results.success ? 'GOOD ✓' : 'ISSUES DETECTED ✗'}`);
    
    if (!results.success) {
      console.log('\n⚠️ Network connectivity issues detected:');
      Object.entries(results.errors).forEach(([key, error]: [string, any]) => {
        console.log(`- ${key}: ${error.message}`);
      });
      
      console.log('\n🔧 Recommended actions:');
      console.log('1. Verify SMTP server configuration (host, port, credentials)');
      console.log('2. Check if outbound SMTP connections are allowed in your production environment');
      console.log('3. Confirm that your SMTP server allows connections from your server IP');
      console.log('4. Make sure your DNS resolution is working correctly');
    }
    
    // Add production specific recommendations if applicable
    if (process.env.NODE_ENV === 'production' && productionIssues.length > 0) {
      console.log('\n🏭 PRODUCTION ENVIRONMENT ISSUES:');
      productionIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      
      // Add to results
      results.productionIssues = productionIssues;
    }
    
    return {
      ...results,
      productionIssues: process.env.NODE_ENV === 'production' ? productionIssues : []
    };
  } catch (error) {
    console.error('Failed to run SMTP diagnostics:', error);
    return {
      success: false,
      results: {},
      errors: { main: { message: String(error) } },
      productionIssues: []
    };
  }
}