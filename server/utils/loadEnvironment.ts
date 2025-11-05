/**
 * Environment Variable Loader
 *
 * This module ensures environment variables are properly loaded in both
 * development and production environments, with a focus on email configuration.
 */

import fs from 'fs';
import path from 'path';

export interface EmailConfig {
  FROM_EMAIL: string;
  SENDGRID_API_KEY: string;
  isConfigured: boolean;
}

/**
 * Load environment variables from a .env file
 * @param filePath Path to the .env file
 * @returns true if file was loaded, false otherwise
 */
function loadEnvFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`Loading environment variables from ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';

          // Remove surrounding quotes if they exist
          value = value.replace(/^['"]|['"]$/g, '');

          if (!process.env[key]) {
            process.env[key] = value;
            if (key.includes('PASS') || key.includes('SECRET') || key.includes('KEY') || key.includes('API')) {
              console.log(`  Set ${key}=[hidden]`);
            } else {
              console.log(`  Set ${key}=${value}`);
            }
          }
        }
      });

      return true;
    }
  } catch (err) {
    console.error(`Error loading env file ${filePath}: ${(err as Error).message}`);
  }

  return false;
}

/**
 * Fall back to defaults if no configuration is found
 */
function loadDefaults(): void {
  console.log(`Setting essential email configuration in ${process.env.NODE_ENV || 'development'} mode`);

  // Always setup the FROM_EMAIL - it may be incomplete in both environments
  if (!process.env.FROM_EMAIL || process.env.FROM_EMAIL.startsWith('@')) {
    process.env.FROM_EMAIL = 'noreply@smart-scheduler.ai';
    console.log(`  Set FROM_EMAIL=noreply@smart-scheduler.ai`);
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('🚨 PRODUCTION MODE: Checking email configuration');

    // In production, we MUST have SendGrid configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ CRITICAL: SENDGRID_API_KEY is not set in production environment!');
      console.error('Email functionality will not work without SendGrid configuration.');
      console.error('');
      console.error('Required environment variables:');
      console.error('- SENDGRID_API_KEY (your SendGrid API key)');
      console.error('- FROM_EMAIL (e.g., noreply@smart-scheduler.ai)');
      console.error('');
      console.error('Your hosting provider should have a secrets management feature for this.');
    } else {
      console.log('✅ SendGrid API key is configured');
    }
  }
}

/**
 * Check if all required email environment variables are set
 */
function validateEmailConfig(): EmailConfig {
  const config: EmailConfig = {
    FROM_EMAIL: process.env.FROM_EMAIL || '',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
    isConfigured: false
  };

  // Check if required variables are set for SendGrid
  const isSendGridConfigured = !!(
    config.FROM_EMAIL &&
    config.SENDGRID_API_KEY
  );

  config.isConfigured = isSendGridConfigured;

  // Log the configuration status
  if (isSendGridConfigured) {
    console.log('✅ SendGrid email configuration is complete.');
    console.log(`- FROM_EMAIL: ${config.FROM_EMAIL}`);
    console.log(`- SENDGRID_API_KEY: [set]`);
  } else {
    console.warn('⚠️ SendGrid configuration incomplete:');
    if (!config.FROM_EMAIL) console.warn('  - FROM_EMAIL not set');
    if (!config.SENDGRID_API_KEY) console.warn('  - SENDGRID_API_KEY not set');
  }

  return config;
}

/**
 * Load all environment variables from various sources
 */
export function loadEnvironment(): EmailConfig {
  console.log(`Loading environment variables in ${process.env.NODE_ENV || 'development'} mode`);

  // Try to load from .env files
  const rootDir = process.cwd();
  const envPaths = [
    path.join(rootDir, `.env.${process.env.NODE_ENV || 'development'}`),
    path.join(rootDir, '.env.production'),
    path.join(rootDir, '.env')
  ];

  let envLoaded = false;
  for (const envPath of envPaths) {
    if (loadEnvFile(envPath)) {
      envLoaded = true;
      break;
    }
  }

  // Fall back to defaults if needed
  if (!envLoaded) {
    loadDefaults();
  }

  // Validate and return the loaded configuration
  return validateEmailConfig();
}

// Export default instance for convenience
export const emailConfig = loadEnvironment();
