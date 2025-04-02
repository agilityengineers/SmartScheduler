import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

/**
 * Comprehensive SMTP configuration diagnostic tool
 * This will help identify issues with SMTP configuration in production
 */
export async function detectSmtpIssues(): Promise<{
  success: boolean;
  issues: string[];
  config: {
    fromEmail: string | null;
    smtpHost: string | null;
    smtpPort: string | null;
    smtpUser: string | null;
    smtpPassSet: boolean;
    smtpSecure: boolean;
    configFileFound: boolean;
    configFilePath: string | null;
    envSource: string;
  };
}> {
  const issues: string[] = [];
  const config = {
    fromEmail: process.env.FROM_EMAIL || null,
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort: process.env.SMTP_PORT || null,
    smtpUser: process.env.SMTP_USER || null,
    smtpPassSet: !!process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    configFileFound: false,
    configFilePath: null as string | null,
    envSource: 'environment variables',
  };

  console.log('🔍 SMTP DIAGNOSTIC: Running comprehensive SMTP configuration check');
  console.log(`ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CURRENT DIRECTORY: ${process.cwd()}`);

  // Check if environment variables are present
  if (!config.smtpHost) {
    issues.push('SMTP_HOST environment variable is missing');
  }
  
  if (!config.smtpPort) {
    issues.push('SMTP_PORT environment variable is missing');
  }
  
  if (!config.smtpUser) {
    issues.push('SMTP_USER environment variable is missing');
  }
  
  if (!config.smtpPassSet) {
    issues.push('SMTP_PASS environment variable is missing');
  }
  
  if (!config.fromEmail) {
    issues.push('FROM_EMAIL environment variable is missing');
  }

  // Check for the config file in multiple locations
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), '..', 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json'),
    path.join(__dirname, '..', 'smtp-config.json'),
    path.join(__dirname, '..', '..', 'smtp-config.json'),
    path.resolve('./smtp-config.json'),
    path.resolve('./server/smtp-config.json')
  ];

  console.log('Looking for SMTP config file in the following locations:');
  for (const configPath of configPaths) {
    console.log(`- Checking: ${configPath}`);
    try {
      if (fs.existsSync(configPath)) {
        config.configFileFound = true;
        config.configFilePath = configPath;
        console.log(`✅ Found config file at: ${configPath}`);
        
        // Check if the config file has valid JSON
        try {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const parsedConfig = JSON.parse(configContent);
          
          // Check if the file has placeholder values
          if (parsedConfig.SMTP_PASS === 'replace-with-actual-password') {
            issues.push('SMTP_PASS in config file is still a placeholder value');
            console.log('⚠️ Config file contains placeholder password!');
          }
          
          // If environment variables are missing, check if the config file has them
          if (!config.smtpHost && parsedConfig.SMTP_HOST) {
            console.log(`Config file has SMTP_HOST: ${parsedConfig.SMTP_HOST}`);
          }
          
          if (!config.smtpUser && parsedConfig.SMTP_USER) {
            console.log(`Config file has SMTP_USER: ${parsedConfig.SMTP_USER}`);
          }
          
          if (!config.smtpPassSet && parsedConfig.SMTP_PASS) {
            console.log('Config file has SMTP_PASS set');
          }
          
          if (!config.fromEmail && parsedConfig.FROM_EMAIL) {
            console.log(`Config file has FROM_EMAIL: ${parsedConfig.FROM_EMAIL}`);
          }
          
          // If we're using the config file values, indicate that
          if ((!config.smtpHost || !config.smtpUser || !config.smtpPassSet || !config.fromEmail) &&
              (parsedConfig.SMTP_HOST || parsedConfig.SMTP_USER || parsedConfig.SMTP_PASS || parsedConfig.FROM_EMAIL)) {
            config.envSource = 'config file (not being properly loaded)';
          }
          
        } catch (parseError) {
          issues.push(`Config file at ${configPath} contains invalid JSON`);
          console.log(`⚠️ Config file parsing error: ${(parseError as Error).message}`);
        }
        
        break;
      }
    } catch (err) {
      console.log(`Error checking path ${configPath}: ${(err as Error).message}`);
    }
  }

  if (!config.configFileFound) {
    issues.push('SMTP configuration file not found');
  }

  // Try to verify SMTP connection if we have credentials
  if (config.smtpHost && config.smtpUser && config.smtpPassSet) {
    try {
      console.log(`🔄 Testing SMTP connection to ${config.smtpHost}:${config.smtpPort || '587'}`);
      
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort ? parseInt(config.smtpPort) : 587,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: process.env.SMTP_PASS || ''
        },
        connectionTimeout: 10000,
        logger: true,
        debug: true // Enables SMTP connection debugging
      });
      
      // Test the connection
      const verifyResult = await transporter.verify();
      
      if (verifyResult) {
        console.log('✅ SMTP connection verified successfully!');
      } else {
        issues.push('SMTP connection verification failed');
        console.log('❌ SMTP connection verification failed');
      }
    } catch (verifyError) {
      issues.push(`SMTP connection error: ${(verifyError as Error).message}`);
      console.log(`❌ SMTP connection error: ${(verifyError as Error).message}`);
    }
  } else {
    issues.push('Cannot test SMTP connection because credentials are missing');
  }

  // Additional platform-specific checks
  if (process.env.NODE_ENV === 'production') {
    // Check for Replit-specific environment issues
    if (process.env.REPLIT_OWNER) {
      console.log('Running in Replit environment');
      
      // Check if Secrets are properly set in Replit
      if (!process.env.SMTP_PASS) {
        issues.push('SMTP_PASS secret not set in Replit. Use the Secrets tab to add it.');
      }
    }
  }

  return {
    success: issues.length === 0,
    issues,
    config
  };
}

export async function printSmtpDiagnosticReport(): Promise<void> {
  console.log('=================================================================');
  console.log('📊 SMTP DIAGNOSTIC REPORT');
  console.log('=================================================================');
  
  const result = await detectSmtpIssues();
  
  console.log(`ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
  console.log(`TIME: ${new Date().toISOString()}`);
  console.log(`WORKING DIRECTORY: ${process.cwd()}`);
  console.log('\n=== SMTP CONFIGURATION ===');
  console.log(`FROM_EMAIL: ${result.config.fromEmail || 'NOT SET ❌'}`);
  console.log(`SMTP_HOST: ${result.config.smtpHost || 'NOT SET ❌'}`);
  console.log(`SMTP_PORT: ${result.config.smtpPort || 'NOT SET ❌'}`);
  console.log(`SMTP_USER: ${result.config.smtpUser || 'NOT SET ❌'}`);
  console.log(`SMTP_PASS: ${result.config.smtpPassSet ? 'SET ✅' : 'NOT SET ❌'}`);
  console.log(`SMTP_SECURE: ${result.config.smtpSecure ? 'true' : 'false'}`);
  console.log(`CONFIG FILE: ${result.config.configFileFound ? `Found at ${result.config.configFilePath} ✅` : 'Not found ❌'}`);
  console.log(`CONFIGURATION SOURCE: ${result.config.envSource}`);
  
  console.log('\n=== ISSUES DETECTED ===');
  if (result.issues.length === 0) {
    console.log('No issues detected! ✅');
  } else {
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n=== RECOMMENDATION ===');
  if (result.issues.length === 0) {
    console.log('Your SMTP configuration looks good!');
  } else {
    console.log('Please fix the issues listed above to enable email functionality.');
    
    // Provide specific recommendations
    if (result.issues.some(issue => issue.includes('placeholder'))) {
      console.log('\n⚠️ Your configuration file contains placeholder passwords!');
      console.log('- Update smtp-config.json with your actual SMTP password');
      console.log('- OR set the SMTP_PASS environment variable');
    }
    
    if (!result.config.configFileFound) {
      console.log('\n⚠️ No configuration file found!');
      console.log('- Create smtp-config.json in the project root or server directory');
      console.log('- Format: {"FROM_EMAIL":"your-email", "SMTP_HOST":"your-host", "SMTP_PORT":"465", "SMTP_USER":"your-user", "SMTP_PASS":"your-pass", "SMTP_SECURE":"true"}');
    }
    
    if (process.env.NODE_ENV === 'production' && process.env.REPLIT_OWNER) {
      console.log('\n⚠️ Replit-specific recommendations:');
      console.log('- Add Secrets in the Replit Secrets tab for: FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE');
      console.log('- Make sure you click "Apply" or restart your Repl after adding secrets');
    }
  }
  
  console.log('=================================================================');
}

// If this file is run directly, execute the diagnostic
if (require.main === module) {
  printSmtpDiagnosticReport().catch(console.error);
}