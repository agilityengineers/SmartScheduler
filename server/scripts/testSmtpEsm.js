#!/usr/bin/env node

/**
 * SMTP Connectivity Test Script (ESM Version)
 * 
 * This script tests if your SMTP server is reachable and if your credentials work.
 * It is compatible with ESM modules.
 */

// Import required ESM modules
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Print header
console.log('=================================================================');
console.log('📧 SMTP CONNECTIVITY TEST (ESM VERSION)');
console.log('=================================================================');
console.log(`TIME: ${new Date().toISOString()}`);
console.log(`WORKING DIR: ${process.cwd()}`);
console.log();

// Try to load config from file if environment variables aren't set
async function loadConfigIfNeeded() {
  // Check if we have all required env vars
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('Using environment variables for SMTP configuration...');
    return;
  }
  
  // Check for smtp-config.json in various locations
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json'),
    path.join(__dirname, '..', 'smtp-config.json'),
    path.join(__dirname, '..', '..', 'smtp-config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`Found config file at: ${configPath}`);
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        // Load config into process.env if not already set
        if (!process.env.SMTP_HOST) process.env.SMTP_HOST = config.SMTP_HOST;
        if (!process.env.SMTP_PORT) process.env.SMTP_PORT = config.SMTP_PORT;
        if (!process.env.SMTP_USER) process.env.SMTP_USER = config.SMTP_USER;
        if (!process.env.SMTP_PASS) process.env.SMTP_PASS = config.SMTP_PASS;
        if (!process.env.SMTP_SECURE) process.env.SMTP_SECURE = config.SMTP_SECURE;
        if (!process.env.FROM_EMAIL) process.env.FROM_EMAIL = config.FROM_EMAIL;
        
        console.log('SMTP configuration loaded from file.');
        return;
      }
    } catch (err) {
      console.log(`Error loading config from ${configPath}: ${err.message}`);
    }
  }
  
  console.log('No config file found. Using only environment variables.');
}

// Test SMTP connection with transport verification
async function testSmtpConnection() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  if (!host || !user || !pass) {
    console.log('❌ SMTP test failed: Missing configuration.');
    console.log('Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    console.log(`SMTP_HOST: ${host || 'NOT SET'}`);
    console.log(`SMTP_USER: ${user || 'NOT SET'}`);
    console.log(`SMTP_PASS: ${pass ? '[SET]' : 'NOT SET'}`);
    return false;
  }
  
  console.log(`Testing SMTP connection to ${host}:${port} (secure: ${secure})...`);
  
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: true,
    debug: true
  });
  
  try {
    const result = await transporter.verify();
    console.log('✅ SMTP connection successful!');
    return true;
  } catch (error) {
    console.log('❌ SMTP connection failed:');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('certificate')) {
      console.log('\n⚠️ SSL/TLS certificate issue detected. Suggestions:');
      console.log('- Check if SMTP_SECURE is set correctly');
      console.log('- Try setting SMTP_SECURE to "false" for unencrypted connections');
      console.log('- If using port 465, SMTP_SECURE should be "true"');
      console.log('- For port 587, try both "true" and "false" settings');
    }
    
    if (error.message.includes('auth') || error.message.includes('credentials')) {
      console.log('\n⚠️ Authentication issue detected. Suggestions:');
      console.log('- Verify your username and password are correct');
      console.log('- Ensure your SMTP provider hasn\'t blocked your account');
      console.log('- Check if your provider requires app-specific passwords');
    }
    
    return false;
  }
}

// Main function
async function main() {
  try {
    await loadConfigIfNeeded();
    const success = await testSmtpConnection();
    
    console.log('\n=== SUMMARY ===');
    if (success) {
      console.log('✅ SMTP configuration is working correctly!');
      console.log('Your application should be able to send emails successfully.');
    } else {
      console.log('❌ SMTP test failed. Please fix the issues above before proceeding.');
      console.log('Email functionality will not work until SMTP is properly configured.');
    }
  } catch (error) {
    console.log(`Unexpected error: ${error.message}`);
    console.log(error.stack);
  }
  
  console.log('=================================================================');
}

// Run the tests
main();