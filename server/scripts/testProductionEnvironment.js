#!/usr/bin/env node

/**
 * Production Environment Diagnostic Tool
 * 
 * This script performs a comprehensive check of the production environment
 * to identify potential issues with email delivery.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import child_process from 'child_process';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=================================================================');
console.log('🔍 PRODUCTION ENVIRONMENT DIAGNOSTIC TOOL');
console.log('=================================================================');
console.log(`TIME: ${new Date().toISOString()}`);
console.log(`WORKING DIR: ${process.cwd()}`);
console.log(`NODE VERSION: ${process.version}`);
console.log(`PLATFORM: ${process.platform}`);

// Check if we're in production
console.log(`\nENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
console.log(`Production mode: ${process.env.NODE_ENV === 'production' ? 'YES ✅' : 'NO ⚠️'}`);

// Check for Replit environment
const isReplit = !!process.env.REPLIT_OWNER;
console.log(`Replit environment: ${isReplit ? 'YES ✅' : 'NO'}`);

// Check the critical environment variables
console.log('\n=== SMTP ENVIRONMENT VARIABLES ===');
const requiredVars = [
  'FROM_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SECURE'
];

let missingVars = 0;
requiredVars.forEach(variable => {
  const value = process.env[variable];
  if (!value) {
    console.log(`❌ ${variable}: NOT SET`);
    missingVars++;
  } else if (variable === 'SMTP_PASS') {
    console.log(`✅ ${variable}: [HIDDEN]`);
  } else {
    console.log(`✅ ${variable}: ${value}`);
  }
});

if (missingVars > 0) {
  console.log(`\n⚠️ WARNING: ${missingVars} required environment variables are missing.`);
  console.log('Email verification will not work without these variables set.');
} else {
  console.log('\n✅ All required environment variables are present.');
}

// Analyze email configuration for common issues
console.log('\n=== EMAIL CONFIGURATION ANALYSIS ===');

// Check if FROM_EMAIL matches SMTP_USER (common requirement)
if (process.env.FROM_EMAIL && process.env.SMTP_USER) {
  if (process.env.FROM_EMAIL !== process.env.SMTP_USER) {
    console.log(`⚠️ WARNING: FROM_EMAIL (${process.env.FROM_EMAIL}) doesn't match SMTP_USER (${process.env.SMTP_USER})`);
    console.log('This may cause delivery issues with some SMTP providers.');
  } else {
    console.log('✅ FROM_EMAIL matches SMTP_USER correctly.');
  }
}

// Check for default email addresses
const defaultAddresses = ['app@mysmartscheduler.co', '@mysmartscheduler.co'];
if (defaultAddresses.includes(process.env.FROM_EMAIL) || defaultAddresses.includes(process.env.SMTP_USER)) {
  console.log('⚠️ WARNING: Using default email addresses instead of configured values.');
  console.log('This indicates environment variables may not be properly loaded.');
}

// Check for configuration files
console.log('\n=== CONFIGURATION FILES ===');
const configPaths = [
  path.join(process.cwd(), 'smtp-config.json'),
  path.join(process.cwd(), 'server', 'smtp-config.json')
];

let configFound = false;
let configContents = null;

for (const configPath of configPaths) {
  try {
    if (fs.existsSync(configPath)) {
      configFound = true;
      console.log(`✅ Found config file: ${configPath}`);
      
      try {
        configContents = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('Configuration contents:');
        for (const [key, value] of Object.entries(configContents)) {
          if (key === 'SMTP_PASS') {
            console.log(`- ${key}: ${value === 'replace-with-actual-password' ? 'PLACEHOLDER ⚠️' : '[SET]'}`);
          } else {
            console.log(`- ${key}: ${value}`);
          }
        }
        
        // Compare config with environment
        console.log('\nComparing config with environment variables:');
        for (const [key, value] of Object.entries(configContents)) {
          if (key === 'SMTP_PASS') continue;
          
          if (process.env[key] !== value) {
            console.log(`⚠️ Mismatch for ${key}:`);
            console.log(`  - Config: ${value}`);
            console.log(`  - Env: ${process.env[key] || 'NOT SET'}`);
          } else {
            console.log(`✅ ${key} matches between config and environment`);
          }
        }
      } catch (e) {
        console.log(`❌ Error parsing JSON: ${e.message}`);
      }
    }
  } catch (err) {
    console.log(`Error checking config at ${configPath}: ${err.message}`);
  }
}

if (!configFound) {
  console.log('❌ No configuration files found');
}

// Test network connectivity to SMTP server
console.log('\n=== NETWORK CONNECTIVITY ===');

async function testSmtpConnection() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  if (!host || !user || !pass) {
    console.log('❌ Cannot test SMTP connection - missing credentials');
    return false;
  }
  
  console.log(`Testing connection to ${host}:${port} (secure: ${secure})...`);
  
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
    
    const connected = await transporter.verify();
    console.log('✅ SMTP server connection successful!');
    return true;
  } catch (error) {
    console.log(`❌ SMTP Connection Error: ${error.message}`);
    return false;
  }
}

try {
  await testSmtpConnection();
} catch (e) {
  console.log(`Error during SMTP test: ${e.message}`);
}

// Generate recommendations
console.log('\n=== RECOMMENDATIONS ===');

if (missingVars > 0) {
  console.log('1. Set all required environment variables');
  
  if (isReplit) {
    console.log('   - In Replit: Add them as Secrets in the Secrets panel');
    console.log('   - After adding secrets, restart your Repl for them to take effect');
  } else {
    console.log('   - Update your .env file or set them in your hosting environment');
  }
}

if (process.env.FROM_EMAIL !== process.env.SMTP_USER) {
  console.log('2. Make sure FROM_EMAIL matches SMTP_USER unless your provider specifically requires different values');
}

if (defaultAddresses.includes(process.env.FROM_EMAIL) || defaultAddresses.includes(process.env.SMTP_USER)) {
  console.log('3. Update FROM_EMAIL and SMTP_USER to use noreply@mysmartscheduler.co instead of the default values');
}

console.log('\n=== CONCLUSION ===');
if (missingVars === 0 && process.env.FROM_EMAIL === process.env.SMTP_USER && 
    !defaultAddresses.includes(process.env.FROM_EMAIL) && !defaultAddresses.includes(process.env.SMTP_USER)) {
  console.log('✅ Your production environment appears to be properly configured for email delivery.');
  console.log('If you still experience issues, please review the server logs for more specific error messages.');
} else {
  console.log('⚠️ Some issues were detected that might affect email delivery in production.');
  console.log('Please address the recommendations above to improve email delivery reliability.');
}

console.log('=================================================================');