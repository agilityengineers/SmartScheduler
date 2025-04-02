#!/usr/bin/env node
// Production Email Diagnostic Tool
// This tool performs comprehensive email diagnostics for production environments
// Run with: node server/scripts/productionEmailDiagnostic.js your-email@example.com

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');
const chalk = require('chalk');

// Fallback if chalk isn't available
let c = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  white: text => `\x1b[37m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`
};

try {
  c = chalk;
} catch (e) {
  console.log('Using fallback colors (chalk not available)');
}

// Get current file's directory
const __dirname = path.dirname(__filename);

// Load environment variables from .env.production if available
function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), '.env.production'),
    path.join(process.cwd(), '.env')
  ];
  
  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        console.log(c.green(`Loading environment variables from ${envPath}`));
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';
            
            // Remove surrounding quotes if they exist
            value = value.replace(/^['"]|['"]$/g, '');
            
            if (!process.env[key]) {
              process.env[key] = value;
              console.log(`  Set ${key}=${value.substring(0, 3)}${value.length > 3 ? '***' : ''}`);
            }
          }
        }
        
        return true;
      }
    } catch (err) {
      console.error(c.red(`Error loading env file ${envPath}: ${err.message}`));
    }
  }
  
  return false;
}

// Also try to load SMTP config from file if available
function loadSmtpConfigFromFile() {
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(c.green(`Loading SMTP configuration from ${configPath}`));
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        if (!process.env.FROM_EMAIL && config.FROM_EMAIL) {
          process.env.FROM_EMAIL = config.FROM_EMAIL;
          console.log(`  Set FROM_EMAIL=${config.FROM_EMAIL}`);
        }
        
        if (!process.env.SMTP_HOST && config.SMTP_HOST) {
          process.env.SMTP_HOST = config.SMTP_HOST;
          console.log(`  Set SMTP_HOST=${config.SMTP_HOST}`);
        }
        
        if (!process.env.SMTP_PORT && config.SMTP_PORT) {
          process.env.SMTP_PORT = config.SMTP_PORT;
          console.log(`  Set SMTP_PORT=${config.SMTP_PORT}`);
        }
        
        if (!process.env.SMTP_USER && config.SMTP_USER) {
          process.env.SMTP_USER = config.SMTP_USER;
          console.log(`  Set SMTP_USER=${config.SMTP_USER}`);
        }
        
        if (!process.env.SMTP_PASS && config.SMTP_PASS) {
          process.env.SMTP_PASS = config.SMTP_PASS;
          console.log(`  Set SMTP_PASS=********`);
        }
        
        if (!process.env.SMTP_SECURE && config.SMTP_SECURE !== undefined) {
          process.env.SMTP_SECURE = config.SMTP_SECURE.toString();
          console.log(`  Set SMTP_SECURE=${config.SMTP_SECURE}`);
        }
        
        return true;
      }
    } catch (err) {
      console.error(c.red(`Error loading SMTP config file ${configPath}: ${err.message}`));
    }
  }
  
  return false;
}

// Check if FROM_EMAIL is properly formatted
function checkFromEmailFormat() {
  console.log(c.bold('\n=== Checking FROM_EMAIL Format ==='));
  
  if (!process.env.FROM_EMAIL) {
    console.log(c.red('❌ FROM_EMAIL is not configured'));
    return false;
  }
  
  const email = process.env.FROM_EMAIL;
  console.log(`FROM_EMAIL = ${email}`);
  
  if (!email.includes('@')) {
    console.log(c.red('❌ FROM_EMAIL must include @ character'));
    return false;
  }
  
  const [localPart, domain] = email.split('@');
  
  if (!localPart) {
    console.log(c.red('❌ FROM_EMAIL is missing local part (username before @)'));
    console.log(c.yellow('Example: noreply@example.com'));
    return false;
  }
  
  if (!domain) {
    console.log(c.red('❌ FROM_EMAIL is missing domain part (after @)'));
    console.log(c.yellow('Example: noreply@example.com'));
    return false;
  }
  
  // Basic domain format check
  if (!domain.includes('.')) {
    console.log(c.red('❌ FROM_EMAIL domain appears to be invalid (missing TLD)'));
    return false;
  }
  
  console.log(c.green('✅ FROM_EMAIL format appears valid'));
  return true;
}

// Perform DNS lookup on SMTP host
async function checkDnsResolution() {
  console.log(c.bold('\n=== Checking DNS Resolution for SMTP Host ==='));
  
  if (!process.env.SMTP_HOST) {
    console.log(c.red('❌ SMTP_HOST is not configured'));
    return false;
  }
  
  const host = process.env.SMTP_HOST;
  console.log(`SMTP_HOST = ${host}`);
  
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve(host, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    console.log(c.green(`✅ DNS resolution successful. IP address(es):`));
    addresses.forEach(ip => console.log(`   - ${ip}`));
    return true;
  } catch (err) {
    console.log(c.red(`❌ DNS resolution failed: ${err.message}`));
    return false;
  }
}

// Test TCP connection to SMTP server
async function testTcpConnection() {
  console.log(c.bold('\n=== Testing TCP Connection to SMTP Server ==='));
  
  if (!process.env.SMTP_HOST) {
    console.log(c.red('❌ SMTP_HOST is not configured'));
    return false;
  }
  
  if (!process.env.SMTP_PORT) {
    console.log(c.yellow('⚠️ SMTP_PORT is not configured, using default port 465'));
    process.env.SMTP_PORT = '465';
  }
  
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10);
  
  console.log(`Testing connection to ${host}:${port}`);
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    
    // Set a timeout of 5 seconds
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(c.green(`✅ Successfully connected to ${host}:${port}`));
      connected = true;
      socket.end();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(c.red(`❌ Connection timeout when connecting to ${host}:${port}`));
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(c.red(`❌ Failed to connect: ${err.message}`));
      resolve(false);
    });
    
    socket.on('close', () => {
      if (!connected) {
        console.log(c.red(`❌ Connection closed without establishing connection`));
        resolve(false);
      }
    });
    
    socket.connect(port, host);
  });
}

// Test SMTP authentication
async function testSmtpAuth() {
  console.log(c.bold('\n=== Testing SMTP Authentication ==='));
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(c.red('❌ SMTP configuration is incomplete'));
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST ? 'Set' : 'Not set'}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER ? 'Set' : 'Not set'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? 'Set' : 'Not set'}`);
    return false;
  }
  
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  console.log(`Testing SMTP auth with ${process.env.SMTP_HOST}:${port}`);
  console.log(`Using secure connection: ${secure ? 'Yes' : 'No'}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Allow self-signed certificates
        rejectUnauthorized: false
      }
    });
    
    // Verify the connection
    await transporter.verify();
    
    console.log(c.green('✅ SMTP authentication successful'));
    return true;
  } catch (err) {
    console.log(c.red(`❌ SMTP authentication failed: ${err.message}`));
    
    if (err.message.includes('Greeting') || err.message.includes('connection')) {
      console.log(c.yellow('   This may indicate a firewall or network issue'));
    }
    
    if (err.message.includes('535')) {
      console.log(c.yellow('   This indicates invalid credentials (username/password)'));
    }
    
    if (err.message.includes('timeout')) {
      console.log(c.yellow('   Connection timed out - check your firewall settings'));
    }
    
    return false;
  }
}

// Get normalized FROM_EMAIL 
function getNormalizedFromEmail() {
  if (!process.env.FROM_EMAIL) {
    return 'noreply@mysmartscheduler.co'; // Default fallback
  }
  
  // Ensure email has both local and domain parts
  const email = process.env.FROM_EMAIL;
  if (!email.includes('@')) {
    return 'noreply@mysmartscheduler.co';
  }
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return 'noreply@mysmartscheduler.co';
  }
  
  return email;
}

// Send test verification email
async function sendTestVerificationEmail(recipientEmail) {
  console.log(c.bold('\n=== Sending Test Verification Email ==='));
  
  if (!recipientEmail) {
    console.log(c.red('❌ No recipient email provided'));
    return false;
  }
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(c.red('❌ SMTP configuration is incomplete'));
    return false;
  }
  
  const fromEmail = getNormalizedFromEmail();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  console.log(`Sending test email from ${fromEmail} to ${recipientEmail}`);
  console.log(`Using SMTP server: ${process.env.SMTP_HOST}:${port}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Allow self-signed certificates
        rejectUnauthorized: false
      }
    });
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: 'My Smart Scheduler - Email Verification Test',
      text: `
This is a test email to verify that your SMTP configuration is working correctly.

Your SMTP configuration:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${port}
- SMTP User: ${process.env.SMTP_USER}
- Secure Connection: ${secure ? 'Yes' : 'No'}

If you're receiving this email, your email configuration is working correctly!

Verification Link Test: https://mysmartscheduler.co/verify-email?token=TEST_TOKEN

Thank you for using My Smart Scheduler!
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #4a5568;">My Smart Scheduler - Email Verification Test</h2>
  
  <p>This is a test email to verify that your SMTP configuration is working correctly.</p>
  
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #4a5568;">Your SMTP Configuration</h3>
    <ul>
      <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
      <li><strong>SMTP Port:</strong> ${port}</li>
      <li><strong>SMTP User:</strong> ${process.env.SMTP_USER}</li>
      <li><strong>Secure Connection:</strong> ${secure ? 'Yes' : 'No'}</li>
    </ul>
  </div>
  
  <p style="color: #38a169; font-weight: bold;">If you're receiving this email, your email configuration is working correctly!</p>
  
  <div style="margin: 30px 0; padding: 15px; background-color: #ebf8ff; border-radius: 5px;">
    <p style="margin: 0; font-weight: bold;">Verification Link Test:</p>
    <p style="margin: 10px 0 0 0;">
      <a href="https://mysmartscheduler.co/verify-email?token=TEST_TOKEN" 
         style="display: inline-block; background-color: #4299e1; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px;">
        Verify Email Address
      </a>
    </p>
  </div>
  
  <p>Thank you for using My Smart Scheduler!</p>
  
  <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
    This is a diagnostic email sent as part of the production email setup verification process.
  </p>
</div>
      `
    });
    
    console.log(c.green('✅ Test email sent successfully!'));
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.log(c.red(`❌ Failed to send test email: ${err.message}`));
    
    if (err.message.includes('501')) {
      console.log(c.yellow('   This error often indicates an issue with the FROM_EMAIL format'));
      console.log(c.yellow('   Make sure FROM_EMAIL includes both username and domain parts'));
      console.log(c.yellow('   Example: noreply@example.com'));
    }
    
    return false;
  }
}

// Generate summary report
function generateSummaryReport(results) {
  console.log(c.bold('\n=== SMTP Configuration Diagnostic Summary ==='));
  
  let allPassed = true;
  const reportItems = [
    { name: 'FROM_EMAIL Format', result: results.fromEmailFormat },
    { name: 'DNS Resolution', result: results.dnsResolution },
    { name: 'TCP Connection', result: results.tcpConnection },
    { name: 'SMTP Authentication', result: results.smtpAuth },
    { name: 'Test Email Delivery', result: results.testEmail }
  ];
  
  reportItems.forEach(item => {
    console.log(`${item.result ? c.green('✅') : c.red('❌')} ${item.name}`);
    if (!item.result) allPassed = false;
  });
  
  console.log('\n');
  
  if (allPassed) {
    console.log(c.bold(c.green('🎉 All email diagnostics passed successfully!')));
    console.log('Your email configuration is working correctly.');
  } else {
    console.log(c.bold(c.yellow('⚠️ Some email diagnostics failed.')));
    console.log('Please review the issues above and fix your configuration.');
    
    console.log(c.bold('\n=== Troubleshooting Tips ==='));
    
    if (!results.fromEmailFormat) {
      console.log(c.bold('FROM_EMAIL Format Issues:'));
      console.log('- Ensure FROM_EMAIL is in format: username@domain.com');
      console.log('- Make sure it includes both local part (before @) and domain');
    }
    
    if (!results.dnsResolution) {
      console.log(c.bold('DNS Resolution Issues:'));
      console.log('- Verify SMTP_HOST is correct');
      console.log('- Check if the domain is accessible from your server');
    }
    
    if (!results.tcpConnection) {
      console.log(c.bold('TCP Connection Issues:'));
      console.log('- Verify SMTP_PORT is correct (typically 465 for SSL or 587 for TLS)');
      console.log('- Check if your firewall allows outbound connections to this port');
      console.log('- Ensure your hosting provider allows outbound SMTP connections');
    }
    
    if (!results.smtpAuth) {
      console.log(c.bold('SMTP Authentication Issues:'));
      console.log('- Verify SMTP_USER and SMTP_PASS are correct');
      console.log('- Check if SMTP_SECURE is properly set (true for SSL/465, false for TLS/587)');
      console.log('- Make sure your SMTP provider allows authentication from your IP');
    }
    
    if (!results.testEmail) {
      console.log(c.bold('Email Sending Issues:'));
      console.log('- Verify all previous items are passing');
      console.log('- Check if your FROM_EMAIL is authorized to send through your SMTP server');
      console.log('- Ensure the recipient email is valid');
    }
  }
  
  console.log(c.bold('\n=== Configuration Used ==='));
  console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL || 'Not set'}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER ? '******' : 'Not set'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '******' : 'Not set'}`);
  console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'Not set'}`);
}

// Main function
async function main() {
  console.log(c.bold(c.blue('\n=== My Smart Scheduler - Production Email Diagnostic Tool ===\n')));
  
  // Get the recipient email from command line argument
  const recipientEmail = process.argv[2];
  if (!recipientEmail) {
    console.log(c.red('❌ Error: No recipient email provided'));
    console.log(c.yellow('Usage: node server/scripts/productionEmailDiagnostic.js your-email@example.com'));
    return;
  }
  
  // Load environment variables
  console.log(c.bold('=== Loading Configuration ==='));
  loadEnvFile();
  loadSmtpConfigFromFile();
  
  // Set NODE_ENV to production for this test
  process.env.NODE_ENV = 'production';
  
  // Run all checks
  const results = {
    fromEmailFormat: await checkFromEmailFormat(),
    dnsResolution: await checkDnsResolution(),
    tcpConnection: await testTcpConnection(),
    smtpAuth: await testSmtpAuth(),
    testEmail: false
  };
  
  // Only try to send email if previous checks passed
  if (results.fromEmailFormat && results.smtpAuth) {
    results.testEmail = await sendTestVerificationEmail(recipientEmail);
  } else {
    console.log(c.yellow('\n⚠️ Skipping email send test due to previous failures'));
  }
  
  // Generate summary
  generateSummaryReport(results);
}

main().catch(err => {
  console.error(c.red(`❌ Unexpected error: ${err.message}`));
  console.error(err);
});