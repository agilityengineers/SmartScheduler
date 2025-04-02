// SMTP Configuration Diagnostic Tool (ES Module Version)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=================================================================');
console.log('📊 SMTP CONFIGURATION DIAGNOSTIC TOOL');
console.log('=================================================================');
console.log(`TIME: ${new Date().toISOString()}`);
console.log(`WORKING DIR: ${process.cwd()}`);

// Check for environment variables
console.log('\n=== CHECKING ENVIRONMENT VARIABLES ===');
const envVars = {
  'FROM_EMAIL': process.env.FROM_EMAIL,
  'SMTP_HOST': process.env.SMTP_HOST,
  'SMTP_PORT': process.env.SMTP_PORT,
  'SMTP_USER': process.env.SMTP_USER,
  'SMTP_PASS': process.env.SMTP_PASS ? '[SET]' : undefined,
  'SMTP_SECURE': process.env.SMTP_SECURE,
  'NODE_ENV': process.env.NODE_ENV
};

// Print environment variables
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}: ${value || 'NOT SET ❌'}`);
});

// Check configuration files
console.log('\n=== CHECKING CONFIGURATION FILES ===');
const configPaths = [
  path.join(process.cwd(), 'smtp-config.json'),
  path.join(process.cwd(), 'server', 'smtp-config.json'),
  path.resolve('./smtp-config.json'),
  path.resolve('./server/smtp-config.json')
];

let configFileFound = false;
let configFile = null;

for (const configPath of configPaths) {
  try {
    if (fs.existsSync(configPath)) {
      configFileFound = true;
      configFile = configPath;
      console.log(`✅ Found config file at: ${configPath}`);
      
      // Check content but don't expose passwords
      const content = fs.readFileSync(configPath, 'utf8');
      try {
        const parsed = JSON.parse(content);
        console.log('Configuration file contains:');
        
        const placeholders = [
          'replace-with-actual-password',
          'YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE',
          'your-password-here',
          'your-actual-password'
        ];
        
        for (const [key, value] of Object.entries(parsed)) {
          // Don't print the actual password
          if (key === 'SMTP_PASS') {
            const isPlaceholder = placeholders.includes(value);
            console.log(`- ${key}: ${isPlaceholder ? 'PLACEHOLDER ⚠️' : '[SET]'}`);
            
            // Warn about placeholder passwords
            if (isPlaceholder) {
              console.log('⚠️ IMPORTANT: Your config file contains a placeholder password!');
              console.log('   Update this with your actual password to enable SMTP functionality.');
            }
          } else {
            console.log(`- ${key}: ${value}`);
          }
        }
      } catch (e) {
        console.log(`❌ Error parsing config file: ${e.message}`);
      }
      
      break;
    }
  } catch (err) {
    // Do nothing, just continue checking other paths
  }
}

if (!configFileFound) {
  console.log('❌ No SMTP configuration file found in any of the checked locations');
}

// Test SMTP connection
console.log('\n=== TESTING SMTP CONNECTION ===');

// Use environment variables or config file
const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === 'true' || parseInt(port) === 465;

if (host && user && pass) {
  console.log(`Testing SMTP connection to ${host}:${port} (secure: ${secure})...`);
  
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure,
    auth: { user, pass },
    debug: true,
    logger: true
  });
  
  try {
    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ SMTP Connection Error:', error.message);
        console.log('Error details:', error);
      } else {
        console.log('✅ SMTP Server connection successful!');
      }
    });
  } catch (e) {
    console.log('❌ Error verifying SMTP connection:', e.message);
  }
} else {
  console.log('❌ Cannot test SMTP connection - credentials are missing');
}

console.log('\n=== RECOMMENDATIONS ===');
// Provide recommendations based on findings
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('1. Make sure all required SMTP environment variables are set:');
  console.log('   - FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE');
  console.log('   In production, set these as Secrets in your hosting environment');
}

if (!configFileFound) {
  console.log('2. Create an smtp-config.json file in your project root with the following structure:');
  console.log(`
  {
    "FROM_EMAIL": "noreply@mysmartscheduler.co",
    "SMTP_HOST": "server.pushbutton-hosting.com",
    "SMTP_PORT": "465",
    "SMTP_USER": "app@mysmartscheduler.co",
    "SMTP_PASS": "your-actual-password",
    "SMTP_SECURE": "true"
  }
  `);
} else if (configFile && fs.existsSync(configFile)) {
  try {
    const content = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const placeholders = [
      'replace-with-actual-password',
      'YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE',
      'your-password-here',
      'your-actual-password'
    ];
    
    if (placeholders.includes(content.SMTP_PASS)) {
      console.log('3. Your smtp-config.json contains a placeholder password:');
      console.log(`   "${content.SMTP_PASS}"`);
      console.log('   Update this with your actual SMTP password');
    }
  } catch (e) {
    // Ignore parsing errors here
  }
}

console.log('\nIf you still encounter issues, try:');
console.log('- Checking your SMTP provider\'s settings (port, security, authentication methods)');
console.log('- Verifying firewall settings aren\'t blocking outgoing SMTP connections');
console.log('- Testing your credentials with a separate mail client');
console.log('=================================================================');