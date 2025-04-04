import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env file
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      console.error('Error loading .env file:', result.error);
    } else {
      console.log('✅ Environment variables loaded from .env file');
    }
  } else {
    console.warn('⚠️ No .env file found, using default environment variables');
  }
  
  // Log important environment variables (without sensitive values)
  console.log('Environment:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- USE_POSTGRES: ${process.env.USE_POSTGRES || 'false'}`);
  
  // Check for required environment variables
  checkRequiredEnvVars();
}

// Check if all required environment variables are set
function checkRequiredEnvVars() {
  const requiredVars = [];
  const missingVars = [];
  
  // If using PostgreSQL, we need DATABASE_URL
  if (process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production') {
    requiredVars.push('DATABASE_URL');
  }
  
  // Check which variables are missing
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  // Log warning if any required variables are missing
  if (missingVars.length > 0) {
    console.error(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Execute the loadEnv function
loadEnv();