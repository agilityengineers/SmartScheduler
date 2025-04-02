// Production Email Diagnostic Script
// Use this script to comprehensively diagnose email issues in production
// Run with: node server/scripts/productionEmailDiagnostic.js recipient@example.com

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import net from 'net';
import os from 'os';
import crypto from 'crypto';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Utility functions
function logSection(title) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.bright + colors.blue + ' ' + title + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(60) + colors.reset);
}

function logSuccess(message) {
  console.log(colors.green + '✓ ' + message + colors.reset);
}

function logWarning(message) {
  console.log(colors.yellow + '⚠ ' + message + colors.reset);
}

function logError(message) {
  console.log(colors.red + '✗ ' + message + colors.reset);
}

function logInfo(message) {
  console.log(colors.cyan + 'ℹ ' + message + colors.reset);
}

// Test DNS resolution
async function testDnsResolution(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        logError(`DNS resolution failed for ${hostname}: ${err.message}`);
        resolve({ success: false, error: err.message });
      } else {
        logSuccess(`DNS resolution successful: ${hostname} → ${address}`);
        resolve({ success: true, address });
      }
    });
  });
}

// Test TCP connection
async function testTcpConnection(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    
    socket.setTimeout(10000); // 10 second timeout
    
    socket.on('connect', () => {
      connected = true;
      logSuccess(`TCP connection successful to ${host}:${port}`);
      socket.end();
      resolve({ success: true });
    });
    
    socket.on('timeout', () => {
      logError(`TCP connection timeout to ${host}:${port}`);
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
    
    socket.on('error', (err) => {
      logError(`TCP connection error to ${host}:${port}: ${err.message}`);
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
    
    logInfo(`Attempting TCP connection to ${host}:${port}...`);
    socket.connect(port, host);
  });
}

// Load SMTP configuration from various sources
async function loadSmtpConfig() {
  logSection('LOADING SMTP CONFIGURATION');
  
  // First try environment variables
  let smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co',
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
  };
  
  // If env vars are set, use them
  if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    logSuccess('SMTP configuration loaded from environment variables');
    
    // Log masked values
    console.log('- SMTP_HOST: ' + smtpConfig.host);
    console.log('- SMTP_PORT: ' + smtpConfig.port);
    console.log('- SMTP_USER: ' + smtpConfig.user);
    console.log('- SMTP_PASS: ' + '*'.repeat(8)); // Don't log actual password
    console.log('- FROM_EMAIL: ' + smtpConfig.fromEmail);
    console.log('- SMTP_SECURE: ' + smtpConfig.secure);
    
    return smtpConfig;
  }
  
  // If env vars aren't complete, try config files
  logInfo('SMTP environment variables incomplete or missing, checking config files');
  
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json'),
    path.join(__dirname, '..', 'smtp-config.json'),
    path.join(__dirname, '..', '..', 'smtp-config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        logInfo(`Found config file at: ${configPath}`);
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        smtpConfig = {
          host: config.SMTP_HOST || smtpConfig.host,
          port: config.SMTP_PORT ? parseInt(config.SMTP_PORT) : smtpConfig.port,
          user: config.SMTP_USER || smtpConfig.user,
          pass: config.SMTP_PASS || smtpConfig.pass,
          fromEmail: config.FROM_EMAIL || smtpConfig.fromEmail,
          secure: config.SMTP_SECURE === 'true' || smtpConfig.port === 465
        };
        
        if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
          logSuccess('SMTP configuration loaded from config file');
          
          // Check for placeholder passwords
          const placeholders = [
            'replace-with-actual-password',
            'YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE',
            'your-password-here',
            'your-actual-password'
          ];
          
          if (placeholders.includes(smtpConfig.pass)) {
            logError('Config file contains a placeholder password! Production email won\'t work.');
            logError(`Found placeholder: "${smtpConfig.pass}"`);
          }
          
          return smtpConfig;
        }
      }
    } catch (err) {
      logError(`Error loading config file from ${configPath}: ${err.message}`);
    }
  }
  
  // If we reach here, no complete config was found
  logError('No complete SMTP configuration found in environment or config files.');
  return smtpConfig;
}

// Test FROM_EMAIL format
function validateFromEmail(fromEmail) {
  logSection('VALIDATING FROM_EMAIL FORMAT');
  
  if (!fromEmail) {
    logError('FROM_EMAIL is not set');
    return false;
  }
  
  if (fromEmail.startsWith('@')) {
    logError('FROM_EMAIL is missing the username part: ' + fromEmail);
    logInfo('Correct format example: noreply@example.com');
    return false;
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fromEmail)) {
    logError('FROM_EMAIL has invalid format: ' + fromEmail);
    logInfo('Correct format example: noreply@example.com');
    return false;
  }
  
  const [username, domain] = fromEmail.split('@');
  
  if (!username || username.trim() === '') {
    logError('FROM_EMAIL username part is empty');
    return false;
  }
  
  if (!domain || domain.trim() === '') {
    logError('FROM_EMAIL domain part is empty');
    return false;
  }
  
  logSuccess('FROM_EMAIL format is valid: ' + fromEmail);
  return true;
}

// Test SMTP authentication
async function testSmtpAuth(config) {
  logSection('TESTING SMTP AUTHENTICATION');
  
  if (!config.host || !config.user || !config.pass) {
    logError('Missing required SMTP configuration (host, user, pass)');
    return false;
  }
  
  try {
    logInfo(`Creating SMTP transport for ${config.host}:${config.port}`);
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
    
    logInfo('Verifying SMTP connection and credentials...');
    await transporter.verify();
    
    logSuccess('SMTP authentication successful!');
    return true;
  } catch (error) {
    logError(`SMTP authentication failed: ${error.message}`);
    if (error.code) {
      logError(`Error code: ${error.code}`);
    }
    
    if (error.message.includes('invalid credentials') || 
        error.message.includes('authentication failed') ||
        error.message.includes('auth') || 
        error.message.includes('535')) {
      logError('This appears to be an authentication issue - check your username and password');
    } else if (error.code === 'ECONNREFUSED') {
      logError('Connection refused - check if the SMTP server is accessible from your environment');
    } else if (error.code === 'ETIMEDOUT') {
      logError('Connection timed out - check if the SMTP server is accessible from your environment');
    } else if (error.code === 'ESOCKET') {
      logError('Socket error - check if the SMTP server supports the security settings you specified');
    }
    
    return false;
  }
}

// Test sending a verification email
async function sendTestVerificationEmail(config, recipient) {
  logSection('SENDING TEST VERIFICATION EMAIL');
  
  if (!config.host || !config.user || !config.pass) {
    logError('Missing required SMTP configuration (host, user, pass)');
    return false;
  }
  
  if (!recipient) {
    logError('No recipient email address provided');
    return false;
  }
  
  // Make sure FROM_EMAIL has username part
  let fromEmail = config.fromEmail;
  if (fromEmail.startsWith('@')) {
    fromEmail = 'noreply' + fromEmail;
    logWarning(`FROM_EMAIL was missing username part, using ${fromEmail} instead`);
  }
  
  // Generate mock verification token and link
  const token = crypto.randomBytes(32).toString('hex');
  const baseUrl = process.env.BASE_URL || 'https://mysmartscheduler.co';
  const verifyLink = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(recipient)}`;
  
  logInfo(`Generated verification link: ${verifyLink}`);
  
  // Create test email transporter
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    debug: true, 
    logger: true
  });
  
  // Email content
  const subject = 'Verify Your Email for My Smart Scheduler (TEST)';
  const text = `
    TEST - Verify Your Email Address

    This is a test email from the My Smart Scheduler application.
    In a real verification email, you would click on this link:

    ${verifyLink}

    This test was sent at: ${new Date().toISOString()}
    From host: ${os.hostname()}
    
    This is a test email and can be safely ignored.
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a86e8;">TEST - Verify Your Email Address</h2>
      <p>This is a test email from the My Smart Scheduler application.</p>
      <p>In a real verification email, you would click on this link:</p>
      
      <div style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
        <a href="${verifyLink}" style="word-break: break-all; color: #4a86e8;">
          ${verifyLink}
        </a>
      </div>
      
      <p><strong>Test information:</strong></p>
      <ul>
        <li>Sent at: ${new Date().toISOString()}</li>
        <li>From host: ${os.hostname()}</li>
        <li>SMTP server: ${config.host}:${config.port}</li>
      </ul>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        This is a test email and can be safely ignored.
      </p>
    </div>
  `;
  
  try {
    logInfo('Attempting to send test verification email...');
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipient,
      subject,
      text,
      html
    });
    
    logSuccess('Test verification email sent successfully!');
    logSuccess(`Message ID: ${info.messageId}`);
    
    // If using ethereal, provide the URL
    if (info.messageId && info.messageId.includes('ethereal')) {
      logInfo('Preview URL: ' + nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    logError(`Failed to send test verification email: ${error.message}`);
    
    if (error.code) {
      logError(`Error code: ${error.code}`);
    }
    
    return false;
  }
}

// Check system environment
function checkSystemEnvironment() {
  logSection('CHECKING SYSTEM ENVIRONMENT');
  
  logInfo(`Node.js version: ${process.version}`);
  logInfo(`Platform: ${os.platform()} ${os.release()}`);
  logInfo(`Hostname: ${os.hostname()}`);
  logInfo(`Process running as: ${process.getuid ? process.getuid() : 'N/A'}`);
  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check for outbound connectivity
  logInfo('Checking outbound internet connectivity...');
  return testTcpConnection('google.com', 443);
}

// Main diagnostic function
async function runDiagnostics(recipient) {
  console.log('\n' + colors.bright + colors.bgBlue + colors.white + ' MY SMART SCHEDULER EMAIL DIAGNOSTICS ' + colors.reset);
  console.log(colors.dim + 'Running comprehensive email delivery diagnostics...' + colors.reset);
  console.log(colors.dim + `Timestamp: ${new Date().toISOString()}` + colors.reset);
  
  // Step 1: Check system environment
  await checkSystemEnvironment();
  
  // Step 2: Load SMTP configuration
  const smtpConfig = await loadSmtpConfig();
  
  // Step 3: Validate FROM_EMAIL format
  const isFromEmailValid = validateFromEmail(smtpConfig.fromEmail);
  
  if (!isFromEmailValid) {
    logWarning('FROM_EMAIL has issues. Attempting to fix for this diagnostic run...');
    if (smtpConfig.fromEmail.startsWith('@')) {
      smtpConfig.fromEmail = 'noreply' + smtpConfig.fromEmail;
      logInfo(`Using ${smtpConfig.fromEmail} for testing`);
    } else if (!smtpConfig.fromEmail || smtpConfig.fromEmail.trim() === '') {
      smtpConfig.fromEmail = 'noreply@mysmartscheduler.co';
      logInfo(`Using ${smtpConfig.fromEmail} as fallback for testing`);
    }
  }
  
  // Step 4: Test DNS resolution
  if (smtpConfig.host) {
    await testDnsResolution(smtpConfig.host);
  } else {
    logError('Cannot test DNS resolution: SMTP_HOST is not configured');
  }
  
  // Step 5: Test TCP connection
  if (smtpConfig.host && smtpConfig.port) {
    await testTcpConnection(smtpConfig.host, smtpConfig.port);
  } else {
    logError('Cannot test TCP connection: SMTP_HOST or SMTP_PORT is not configured');
  }
  
  // Step 6: Test SMTP authentication
  const isAuthSuccessful = await testSmtpAuth(smtpConfig);
  
  // Step 7: Send test verification email
  if (isAuthSuccessful) {
    await sendTestVerificationEmail(smtpConfig, recipient);
  } else {
    logError('Cannot send test email due to authentication issues');
  }
  
  // Summarize findings
  logSection('DIAGNOSTIC SUMMARY');
  
  const issues = [];
  
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    issues.push('Missing SMTP configuration (host, user, or pass)');
  }
  
  if (!isFromEmailValid) {
    issues.push('FROM_EMAIL format issue');
  }
  
  if (!isAuthSuccessful) {
    issues.push('SMTP authentication failed');
  }
  
  if (issues.length > 0) {
    logError('Found issues that may prevent email delivery:');
    issues.forEach((issue, i) => {
      console.log(`${i+1}. ${issue}`);
    });
    
    logInfo('Please fix these issues to enable email functionality.');
  } else {
    logSuccess('No major issues found. Email delivery should be working.');
    logInfo('Check that the test email was received at: ' + recipient);
  }
  
  logSection('END OF DIAGNOSTICS');
}

// Entry point
async function main() {
  const recipient = process.argv[2];
  
  if (!recipient) {
    console.error('Error: No recipient email provided');
    console.error('Usage: node server/scripts/productionEmailDiagnostic.js recipient@example.com');
    process.exit(1);
  }
  
  try {
    await runDiagnostics(recipient);
  } catch (error) {
    console.error('Unexpected error during diagnostics:', error);
  }
}

main();