// Email Network Test Script
// Tests basic network connectivity to email services
import dns from 'dns';
import net from 'net';

// List of common SMTP servers to test
const commonSmtpServers = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { name: 'Gmail SSL', host: 'smtp.gmail.com', port: 465 },
  { name: 'Outlook', host: 'smtp.office365.com', port: 587 },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587 },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587 },
  { name: 'Ethereal', host: 'smtp.ethereal.email', port: 587 },
];

// SMTP server from environment variables
const envSmtpServer = process.env.SMTP_HOST 
  ? { 
      name: 'Your SMTP Server', 
      host: process.env.SMTP_HOST, 
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587 
    } 
  : null;

// Test DNS resolution for a domain
async function testDnsResolution(domain) {
  console.log(`Testing DNS resolution for ${domain}...`);
  
  try {
    // Try to resolve the domain
    const addresses = await dns.promises.resolve(domain);
    console.log(`✅ Successfully resolved ${domain}`);
    console.log(`   IP addresses: ${addresses.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to resolve ${domain}: ${error.message}`);
    return false;
  }
}

// Test TCP connection to a host and port
async function testTcpConnection(host, port) {
  return new Promise((resolve) => {
    console.log(`Testing TCP connection to ${host}:${port}...`);
    
    const socket = new net.Socket();
    let resolved = false;
    
    // Set a timeout
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`✅ Successfully connected to ${host}:${port}`);
      socket.end();
      if (!resolved) {
        resolved = true;
        resolve(true);
      }
    });
    
    socket.on('timeout', () => {
      console.error(`❌ Connection to ${host}:${port} timed out`);
      socket.destroy();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
    
    socket.on('error', (error) => {
      console.error(`❌ Failed to connect to ${host}:${port}: ${error.message}`);
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
    
    // Attempt to connect
    socket.connect(port, host);
  });
}

// Main test function
async function testEmailNetwork() {
  console.log('🔍 EMAIL NETWORK CONNECTIVITY TEST');
  console.log('================================');
  
  // Current environment info
  console.log('\nEnvironment Information:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
  
  // Test common email domains
  console.log('\n1. Testing DNS Resolution for Common Email Domains');
  console.log('------------------------------------------------');
  const emailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'example.com'];
  
  // Add sender domain if configured
  if (process.env.FROM_EMAIL) {
    const fromDomain = process.env.FROM_EMAIL.split('@')[1];
    if (fromDomain && !emailDomains.includes(fromDomain)) {
      emailDomains.push(fromDomain);
    }
  }
  
  // Add SMTP host domain if configured
  if (process.env.SMTP_HOST) {
    emailDomains.push(process.env.SMTP_HOST);
  }
  
  for (const domain of emailDomains) {
    await testDnsResolution(domain);
  }
  
  // Test connectivity to SMTP servers
  console.log('\n2. Testing TCP Connectivity to Common SMTP Servers');
  console.log('------------------------------------------------');
  
  // Add environment server to the beginning if configured
  const smtpServers = [...commonSmtpServers];
  if (envSmtpServer) {
    smtpServers.unshift(envSmtpServer);
  }
  
  const results = [];
  
  for (const server of smtpServers) {
    console.log(`\nTesting ${server.name} (${server.host}:${server.port})`);
    
    // First test DNS resolution
    const dnsSuccess = await testDnsResolution(server.host);
    
    // Then test TCP connection if DNS resolved
    let tcpSuccess = false;
    if (dnsSuccess) {
      tcpSuccess = await testTcpConnection(server.host, server.port);
    }
    
    results.push({
      name: server.name,
      host: server.host,
      port: server.port,
      dnsResolution: dnsSuccess,
      tcpConnection: tcpSuccess,
      isConfigured: envSmtpServer && envSmtpServer.host === server.host
    });
  }
  
  // Display summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('======================');
  
  // Format as a table
  console.log('\nSMTP Server Connection Results:');
  console.log('---------------------------------');
  console.log('Server Name        | Host                   | Port | DNS | TCP | Configured');
  console.log('-------------------|------------------------|------|-----|-----|------------');
  
  for (const result of results) {
    const name = result.name.padEnd(19);
    const host = result.host.padEnd(24);
    const port = String(result.port).padEnd(6);
    const dns = result.dnsResolution ? '✅' : '❌';
    const tcp = result.tcpConnection ? '✅' : '❌';
    const configured = result.isConfigured ? '✅' : '';
    
    console.log(`${name}| ${host}| ${port}| ${dns}  | ${tcp}  | ${configured}`);
  }
  
  // Analyze results for configured SMTP server
  console.log('\n🔍 ANALYSIS FOR CONFIGURED SMTP SERVER');
  console.log('-------------------------------------');
  
  if (envSmtpServer) {
    const configuredResult = results.find(r => r.host === envSmtpServer.host && r.port === envSmtpServer.port);
    
    if (configuredResult) {
      if (!configuredResult.dnsResolution) {
        console.log('❌ DNS RESOLUTION ISSUE:');
        console.log(`   Your configured SMTP server (${envSmtpServer.host}) cannot be resolved.`);
        console.log('   This suggests a problem with the hostname or DNS configuration.');
        console.log('   - Verify that the SMTP_HOST is spelled correctly');
        console.log('   - Check if your network can resolve this domain name');
      } else if (!configuredResult.tcpConnection) {
        console.log('❌ TCP CONNECTION ISSUE:');
        console.log(`   Your configured SMTP server (${envSmtpServer.host}:${envSmtpServer.port}) cannot be reached.`);
        console.log('   This suggests a network connectivity or firewall issue.');
        console.log('   - Verify that the SMTP_PORT is correct');
        console.log('   - Check if a firewall is blocking outbound connections on this port');
        console.log('   - Ensure the SMTP server is running and accepting connections');
      } else {
        console.log('✅ CONNECTIVITY SUCCESS:');
        console.log(`   Your configured SMTP server (${envSmtpServer.host}:${envSmtpServer.port}) is reachable.`);
        console.log('   Both DNS resolution and TCP connection tests passed successfully.');
        console.log('   If you are still experiencing email issues, they are likely related to:');
        console.log('   - Authentication problems (incorrect username/password)');
        console.log('   - SMTP server configuration (TLS/SSL settings)');
        console.log('   - Email content or recipient issues');
      }
    }
  } else {
    console.log('⚠️ No SMTP server is configured in environment variables.');
    console.log('   Set SMTP_HOST and SMTP_PORT to test your specific SMTP server.');
  }
  
  // General conclusions
  console.log('\n📝 GENERAL NETWORK ASSESSMENT');
  console.log('---------------------------');
  
  const anyDnsSuccess = results.some(r => r.dnsResolution);
  const anyTcpSuccess = results.some(r => r.tcpConnection);
  
  if (!anyDnsSuccess) {
    console.log('❌ SEVERE NETWORK ISSUE:');
    console.log('   Cannot resolve any SMTP server hostnames.');
    console.log('   This suggests a major DNS resolution problem on your network.');
    console.log('   - Check your DNS server configuration');
    console.log('   - Verify internet connectivity');
  } else if (!anyTcpSuccess) {
    console.log('❌ SEVERE CONNECTIVITY ISSUE:');
    console.log('   Cannot connect to any SMTP servers.');
    console.log('   This suggests outbound connections are being blocked.');
    console.log('   - Check firewall settings for outbound SMTP traffic');
    console.log('   - Verify if your network restricts access to email servers');
  } else {
    console.log('✅ BASIC NETWORK CONNECTIVITY:');
    console.log('   Your system can resolve DNS and reach at least some SMTP servers.');
    console.log('   If you are experiencing issues with a specific SMTP server,');
    console.log('   refer to the detailed results above for that particular server.');
  }
}

testEmailNetwork().catch(console.error);