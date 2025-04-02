// Test script to verify if SMTP configuration file is properly loaded

import fs from 'fs';
import path from 'path';

// Get the absolute path to the SMTP config file - try multiple potential locations
const configPaths = [
  path.join(process.cwd(), 'smtp-config.json'),
  path.join(process.cwd(), '..', 'smtp-config.json'), 
  path.join(process.cwd(), 'server', 'smtp-config.json')
];

// Find the first path that exists
let configPath = null;
for (const potentialPath of configPaths) {
  if (fs.existsSync(potentialPath)) {
    configPath = potentialPath;
    break;
  }
}

// Default to the first path if none found (for error reporting)
if (!configPath) {
  configPath = configPaths[0];
}

console.log('=== SMTP Configuration File Diagnostic ===');
console.log('Checking file at:', configPath);

// Check if the file exists
if (fs.existsSync(configPath)) {
  console.log('✅ SMTP configuration file found');
  
  try {
    // Try to read and parse the file
    const configContent = fs.readFileSync(configPath, 'utf8');
    console.log('File content:', configContent);
    
    const config = JSON.parse(configContent);
    console.log('Parsed configuration:');
    console.log('- FROM_EMAIL:', config.FROM_EMAIL || '[not set]');
    console.log('- SMTP_HOST:', config.SMTP_HOST || '[not set]');
    console.log('- SMTP_PORT:', config.SMTP_PORT || '[not set]');
    console.log('- SMTP_USER:', config.SMTP_USER || '[not set]');
    console.log('- SMTP_PASS:', config.SMTP_PASS ? '[set]' : '[not set]');
    console.log('- SMTP_SECURE:', config.SMTP_SECURE || '[not set]');
    
    // Check if all required fields are present
    const requiredFields = ['FROM_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present in the configuration file');
    } else {
      console.log('❌ The following required fields are missing:', missingFields.join(', '));
    }
    
    // Now test setting these values as environment variables
    console.log('\nSetting configuration values as environment variables:');
    
    if (config.FROM_EMAIL) process.env.FROM_EMAIL = config.FROM_EMAIL;
    if (config.SMTP_HOST) process.env.SMTP_HOST = config.SMTP_HOST;
    if (config.SMTP_PORT) process.env.SMTP_PORT = config.SMTP_PORT;
    if (config.SMTP_USER) process.env.SMTP_USER = config.SMTP_USER;
    if (config.SMTP_PASS) process.env.SMTP_PASS = config.SMTP_PASS;
    if (config.SMTP_SECURE) process.env.SMTP_SECURE = config.SMTP_SECURE;
    
    console.log('- FROM_EMAIL env var:', process.env.FROM_EMAIL || '[not set]');
    console.log('- SMTP_HOST env var:', process.env.SMTP_HOST || '[not set]');
    console.log('- SMTP_PORT env var:', process.env.SMTP_PORT || '[not set]');
    console.log('- SMTP_USER env var:', process.env.SMTP_USER || '[not set]');
    console.log('- SMTP_PASS env var:', process.env.SMTP_PASS ? '[set]' : '[not set]');
    console.log('- SMTP_SECURE env var:', process.env.SMTP_SECURE || '[not set]');
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error reading or parsing configuration file:', error.message);
  }
} else {
  console.error('❌ SMTP configuration file not found at:', configPath);
  console.log('\nPossible solutions:');
  console.log('1. Create the file at the path above with the following structure:');
  console.log(`{
  "FROM_EMAIL": "noreply@mysmartscheduler.co",
  "SMTP_HOST": "server.pushbutton-hosting.com",
  "SMTP_PORT": "465",
  "SMTP_USER": "app@mysmartscheduler.co",
  "SMTP_PASS": "your-smtp-password",
  "SMTP_SECURE": "true"
}`);
  console.log('\n2. Ensure the file has proper read permissions');
  console.log('3. Verify that the deployment process includes this file');
}