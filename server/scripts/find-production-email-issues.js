/**
 * Production Email Issue Finder
 * This script identifies differences between development and production environments
 * that might be causing email problems
 */

// Required imports
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to detect Replit environment
function isReplitEnvironment() {
  return !!process.env.REPLIT_DB_URL || !!process.env.REPLIT_OWNER;
}

// Function to check environment variables
function checkEnvironmentVariables() {
  console.log('\n===== CHECKING ENVIRONMENT VARIABLES =====');
  
  const requiredVars = [
    'FROM_EMAIL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_SECURE'
  ];
  
  let missingVars = [];
  
  // Check each variable
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: Missing or not set`);
    } else {
      if (varName.includes('PASS') || varName.includes('SECRET')) {
        console.log(`✅ ${varName}: Set (value hidden)`);
      } else {
        console.log(`✅ ${varName}: "${process.env[varName]}"`);
      }
    }
  }
  
  // Check if running in production mode
  console.log(`\nNode Environment: ${process.env.NODE_ENV || 'not set (defaults to development)'}`);
  console.log(`Running in Replit: ${isReplitEnvironment() ? 'Yes' : 'No'}`);
  
  // Return summary
  return {
    allVarsPresent: missingVars.length === 0,
    missingVars
  };
}

// Function to check if the server blocks outbound SMTP
async function checkOutboundSmtp() {
  console.log('\n===== CHECKING OUTBOUND SMTP ACCESS =====');
  
  // Skip invasive port testing in production
  if (isReplitEnvironment()) {
    console.log('Skipping general port tests in Replit environment to avoid violating terms of service.');
  }
  
  // Attempt connection to our actual SMTP server with auth
  console.log('\nTesting connection to our configured SMTP server...');
  const smtpHost = process.env.SMTP_HOST || 'server.pushbutton-hosting.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');
  const smtpUser = process.env.SMTP_USER || 'noreply@mysmartscheduler.co';
  const smtpPass = process.env.SMTP_PASS || 'Success2025';
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  console.log(`Server details: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);
  console.log(`User: ${smtpUser}`);
  console.log(`Using password: ${smtpPass ? 'Yes' : 'No'}`);
  
  try {
    console.log('Creating transport and attempting to verify connection...');
    // Create transporter with auth
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      debug: true
    });
    
    // Use verify instead of direct socket connection
    console.log('Verifying SMTP connection...');
    const verified = await new Promise((resolve, reject) => {
      // Set a timeout in case verify hangs
      const timeout = setTimeout(() => {
        reject(new Error('Verification timed out after 15 seconds'));
      }, 15000);
      
      transporter.verify((err, success) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          resolve(success);
        }
      });
    });
    
    console.log(`✅ Successfully verified connection to ${smtpHost}:${smtpPort}`);
    console.log(`Verification result: ${verified}`);
    
    // Try to send a test email if verification succeeded
    if (verified) {
      console.log('\nAttempting to send a test email to check full email flow...');
      try {
        // Use a short timeout for the operation
        const emailResult = await Promise.race([
          transporter.sendMail({
            from: process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co',
            to: "test-" + Math.floor(Math.random() * 10000) + "@example.com", // Use a test address
            subject: "SMTP Diagnostic Test",
            text: "This is a test email to verify SMTP functionality from diagnostics.",
            html: "<p>This is a test email to verify SMTP functionality from diagnostics.</p>"
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Email sending timed out')), 10000))
        ]);
        
        console.log('✅ Test email accepted by server');
        console.log('Message ID:', emailResult.messageId);
      } catch (emailErr) {
        console.log(`❌ Test email sending failed: ${emailErr.message}`);
        // This failure doesn't mean the connection is bad, just that email delivery failed
      }
    }
    
    return true;
  } catch (err) {
    console.log(`❌ Failed to connect to ${smtpHost}:${smtpPort}: ${err.message}`);
    
    // Provide more specific error analysis
    if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
      console.log('📋 This suggests a network connectivity issue or firewall restriction.');
      console.log('   Replit may be blocking outbound connections to this SMTP server.');
    } else if (err.code === 'EAUTH') {
      console.log('📋 This is an authentication error - credentials are being rejected.');
      console.log('   Check your username and password.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('📋 Connection refused - the server actively rejected the connection.');
      console.log('   This may happen if the server has IP restrictions or the port is incorrect.');
    }
    
    return false;
  }
}

// Function to check the production environment
async function checkProductionEmail() {
  console.log('====================================================');
  console.log('PRODUCTION EMAIL DIAGNOSTICS');
  console.log('====================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Current Working Directory: ${process.cwd()}`);
  
  // First load environment variables
  try {
    // Try to load from dotenv file
    const result = dotenv.config();
    if (result.error) {
      console.log(`\nEnvironment loading from .env file: FAILED - ${result.error.message}`);
    } else {
      console.log(`\nEnvironment loaded from .env file: SUCCESS`);
    }
    
    // Try to load from smtp-config.json if it exists
    const configPath = path.join(process.cwd(), 'smtp-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        Object.entries(configData).forEach(([key, value]) => {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        });
        console.log('Environment variables also loaded from smtp-config.json');
      } catch (e) {
        console.log(`Error loading from smtp-config.json: ${e.message}`);
      }
    }
  } catch (err) {
    console.log(`\nEnvironment loading error: ${err.message}`);
  }
  
  // Check environment variables
  const envCheck = checkEnvironmentVariables();
  
  // Check outbound SMTP access
  const outboundSmtpAccess = await checkOutboundSmtp();
  
  // Report findings
  console.log('\n===== FINDINGS AND RECOMMENDATIONS =====');
  
  if (!envCheck.allVarsPresent) {
    console.log('❌ PROBLEM: Missing required environment variables');
    console.log('   Missing variables:', envCheck.missingVars.join(', '));
    console.log('   SOLUTION: Add these variables to your environment or smtp-config.json');
    
    if (isReplitEnvironment()) {
      console.log('   For Replit: Add these as Secrets in the Secrets tab');
    }
  }
  
  if (!outboundSmtpAccess) {
    console.log('\n❌ PROBLEM: Cannot connect to SMTP server');
    console.log('   This could be due to:');
    console.log('   1. Replit blocking outbound SMTP connections');
    console.log('   2. The SMTP server blocking connections from Replit\'s IP address range');
    console.log('   3. Network/firewall issues');
    console.log('   SOLUTIONS:');
    console.log('   - Contact Replit support to confirm if SMTP is allowed');
    console.log('   - Consider using an email API service like SendGrid that doesn\'t use SMTP');
    console.log('   - Contact your email provider to allow connections from Replit\'s IP ranges');
  }
  
  // Look for the smtp-config.json file
  console.log('\nChecking for smtp-config.json...');
  const rootConfigPath = path.join(process.cwd(), 'smtp-config.json');
  const serverConfigPath = path.join(process.cwd(), 'server', 'smtp-config.json');
  
  if (fs.existsSync(rootConfigPath)) {
    console.log(`✅ Found config at ${rootConfigPath}`);
    
    try {
      const content = fs.readFileSync(rootConfigPath, 'utf8');
      const config = JSON.parse(content);
      
      // Check for placeholder passwords
      if (config.SMTP_PASS && (
        config.SMTP_PASS === 'replace-with-actual-password' ||
        config.SMTP_PASS === 'your-actual-password'
      )) {
        console.log('❌ PROBLEM: smtp-config.json contains a placeholder password!');
        console.log('   SOLUTION: Replace the placeholder with your actual password or use environment variables');
      } else if (config.SMTP_PASS) {
        console.log('✅ smtp-config.json has a password set');
      } else {
        console.log('❌ PROBLEM: smtp-config.json is missing SMTP_PASS');
        console.log('   SOLUTION: Add the SMTP_PASS to the config file or set as environment variable');
      }
    } catch (err) {
      console.log(`❌ Error reading smtp-config.json: ${err.message}`);
    }
  } else if (fs.existsSync(serverConfigPath)) {
    console.log(`✅ Found config at ${serverConfigPath}`);
  } else {
    console.log('❌ No smtp-config.json found in root or server directory');
  }
  
  // Final recommendations
  console.log('\n===== RECOMMENDATIONS =====');
  if (isReplitEnvironment()) {
    console.log('For Replit environments:');
    console.log('1. Make sure all environment variables are set as Secrets in the Replit Secrets tab');
    console.log('2. Check if your SMTP password contains special characters that might need escaping');
    console.log('3. Confirm that Replit allows outbound SMTP connections (they may restrict them)');
    console.log('4. Consider using a service like SendGrid or Mailgun instead of direct SMTP');
    console.log('5. Restart your repl after making changes to environment variables');
  } else {
    console.log('For development environments:');
    console.log('1. Ensure smtp-config.json exists with correct values');
    console.log('2. Check environment variables are correctly loaded');
    console.log('3. Verify your SMTP credentials are correct');
  }
  
  console.log('\n====================================================');
}

// Run the checks
checkProductionEmail().catch(console.error);