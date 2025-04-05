import nodemailer from 'nodemailer';
import { Event } from '../../shared/schema';
import { timeZoneService } from './timeZoneService';
import { getPasswordResetHtml, getPasswordResetText, getEmailVerificationHtml, getEmailVerificationText } from './emailTemplates';
import fs from 'fs';
import path from 'path';
import { loadEnvironment, emailConfig } from './loadEnvironment';
import { GoogleEmailService, GoogleEmailConfig } from './googleEmailService';

// Function to load SMTP configuration from a file
function loadSmtpConfigFromFile() {
  try {
    // Try various file paths to handle different environments and contexts
    const paths = [
      path.join(process.cwd(), 'smtp-config.json'),
      path.join(process.cwd(), '..', 'smtp-config.json'),
      path.join(process.cwd(), 'server', 'smtp-config.json'),
      path.join(__dirname, '..', 'smtp-config.json'),
      path.join(__dirname, '..', '..', 'smtp-config.json'),
      path.resolve('./smtp-config.json'),
      path.resolve('./server/smtp-config.json')
    ];
    
    console.log(`📊 Running in environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📄 Checking for SMTP configuration file in multiple locations...`);
    
    let configContent = null;
    let configPath = null;
    
    // Try each path until we find a valid config file
    for (const tryPath of paths) {
      console.log(`- Checking path: ${tryPath}`);
      if (fs.existsSync(tryPath)) {
        configPath = tryPath;
        console.log(`✅ SMTP configuration file found at: ${configPath}`);
        configContent = fs.readFileSync(configPath, 'utf8');
        break;
      }
    }
    
    if (!configContent) {
      console.log('❌ SMTP configuration file not found in any of the checked locations');
      
      // Additional diagnostic information to help troubleshoot
      console.log('📋 Current process working directory:', process.cwd());
      console.log('📋 Current file location:', __filename);
      console.log('📋 NODE_ENV:', process.env.NODE_ENV || 'not set');
      
      // Try to list the server directory to see what's there
      try {
        const serverDir = path.join(process.cwd(), 'server');
        if (fs.existsSync(serverDir)) {
          console.log('📂 Files in the server directory:');
          fs.readdirSync(serverDir).forEach(file => {
            console.log(`- ${file}`);
          });
        }
      } catch (listError: any) {
        console.log('⚠️ Could not list server directory:', listError.message);
      }
      
      return false;
    }
    
    try {
      const config = JSON.parse(configContent);
      console.log('✅ SMTP configuration file successfully parsed, loading settings');
      
      // Verify the required fields exist in the config
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        console.warn('⚠️ SMTP configuration file missing essential fields (SMTP_HOST, SMTP_USER, SMTP_PASS)');
        
        // Log what's missing
        if (!config.SMTP_HOST) console.warn('- Missing SMTP_HOST');
        if (!config.SMTP_USER) console.warn('- Missing SMTP_USER');
        if (!config.SMTP_PASS) console.warn('- Missing SMTP_PASS');
      }
      
      // Check for placeholder passwords
      const placeholderPasswords = [
        'replace-with-actual-password',
        'YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE',
        'your-password-here',
        'your-actual-password'
      ];
      
      if (config.SMTP_PASS && placeholderPasswords.includes(config.SMTP_PASS)) {
        console.error('⛔ ERROR: SMTP_PASS in config file contains a placeholder value!');
        console.error(`⛔ Found placeholder: "${config.SMTP_PASS}"`);
        console.error('⛔ Email functionality will NOT work until you replace this with your actual password.');
        console.error('⛔ Options to fix this:');
        console.error('⛔  1. Edit smtp-config.json and replace the placeholder with your actual password');
        console.error('⛔  2. Set the SMTP_PASS environment variable/secret in your hosting environment');
        
        // Don't load the placeholder password - mark as incomplete instead
        if (process.env.NODE_ENV === 'production') {
          console.error('⛔ CRITICAL: Production environment detected with placeholder passwords!');
          return false;
        }
      }
      
      // Only set environment variables if they're not already set
      if (!process.env.FROM_EMAIL && config.FROM_EMAIL) {
        process.env.FROM_EMAIL = config.FROM_EMAIL;
        console.log(`- Loaded FROM_EMAIL from file: ${config.FROM_EMAIL}`);
      }
      
      if (!process.env.SMTP_HOST && config.SMTP_HOST) {
        process.env.SMTP_HOST = config.SMTP_HOST;
        console.log(`- Loaded SMTP_HOST from file: ${config.SMTP_HOST}`);
      }
      
      if (!process.env.SMTP_PORT && config.SMTP_PORT) {
        process.env.SMTP_PORT = String(config.SMTP_PORT);
        console.log(`- Loaded SMTP_PORT from file: ${config.SMTP_PORT}`);
      }
      
      if (!process.env.SMTP_USER && config.SMTP_USER) {
        process.env.SMTP_USER = config.SMTP_USER;
        console.log(`- Loaded SMTP_USER from file: ${config.SMTP_USER}`);
      }
      
      if (!process.env.SMTP_PASS && config.SMTP_PASS) {
        // Only set the password if it's not a placeholder
        if (!placeholderPasswords.includes(config.SMTP_PASS)) {
          process.env.SMTP_PASS = config.SMTP_PASS;
          console.log(`- Loaded SMTP_PASS from file (password hidden for security)`);
        } else {
          console.log(`⚠️ Not loading placeholder SMTP_PASS from file`);
        }
      }
      
      if (!process.env.SMTP_SECURE && config.SMTP_SECURE !== undefined) {
        process.env.SMTP_SECURE = String(config.SMTP_SECURE);
        console.log(`- Loaded SMTP_SECURE from file: ${config.SMTP_SECURE}`);
      }
      
      // Log the SMTP configuration status after loading
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && 
                               process.env.SMTP_PASS && 
                               !placeholderPasswords.includes(process.env.SMTP_PASS));
      
      console.log(`SMTP configuration after loading file: ${smtpConfigured ? 'COMPLETE ✓' : 'INCOMPLETE ✗'}`);
      
      // Write environment variables to log file for debugging
      try {
        const envLog = `
SMTP environment variables:
FROM_EMAIL=${process.env.FROM_EMAIL || 'not set'}
SMTP_HOST=${process.env.SMTP_HOST || 'not set'}
SMTP_PORT=${process.env.SMTP_PORT || 'not set'}
SMTP_USER=${process.env.SMTP_USER ? 'set' : 'not set'}
SMTP_PASS=${process.env.SMTP_PASS ? 'set' : 'not set'}
SMTP_SECURE=${process.env.SMTP_SECURE || 'not set'}
Environment: ${process.env.NODE_ENV || 'development'}
Timestamp: ${new Date().toISOString()}
`;
        fs.writeFileSync(path.join(process.cwd(), 'smtp_env_vars.log'), envLog);
        console.log('📝 Wrote SMTP environment variables to log file for debugging');
      } catch (logError: any) {
        console.error('⚠️ Failed to write SMTP environment log:', logError.message);
      }
      
      return smtpConfigured;
    } catch (parseError: any) {
      console.error('❌ Failed to parse SMTP configuration file:', parseError.message);
      // Log the first part of the file content to help debug without exposing credentials
      const safeContent = configContent.substring(0, 20) + "...";
      console.error(`File content preview: ${safeContent}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error loading SMTP configuration from file:', error);
    return false;
  }
}

// Function to check email configuration at startup
function checkSmtpConfiguration() {
  console.log('📋 CHECKING EMAIL CONFIGURATION:');
  
  // First load environment from various sources using our robust loader
  const config = loadEnvironment();
  
  // The loadEnvironment function will already have set process.env variables
  
  // Get FROM_EMAIL environment variable or fallback
  const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
  // If email is missing username part (starts with @), add 'noreply'
  const senderEmail = fromEmail.startsWith('@') ? 'noreply' + fromEmail : fromEmail;
  
  // Set the processed email as environment variable
  process.env.FROM_EMAIL = senderEmail;
  
  console.log('Sender email configured as:', senderEmail);
  
  // Check for Google Email configuration
  const googleEmail = process.env.GOOGLE_EMAIL;
  const googleEmailPassword = process.env.GOOGLE_EMAIL_PASSWORD;
  const googleEmailName = process.env.GOOGLE_EMAIL_NAME;
  const isGoogleConfigured = !!(googleEmail && googleEmailPassword);
  
  if (isGoogleConfigured) {
    console.log(`\n📬 GOOGLE EMAIL CONFIGURATION:`);
    console.log(`- GOOGLE_EMAIL: ${googleEmail}`);
    console.log(`- GOOGLE_EMAIL_PASSWORD: ${googleEmailPassword ? '[set]' : '[not set]'}`);
    console.log(`- GOOGLE_EMAIL_NAME: ${googleEmailName || '[not set]'}`);
    console.log('✅ Google Email configuration is complete.');
  }
  
  // Check legacy SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';
  const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);
  
  console.log(`\n📧 LEGACY SMTP CONFIGURATION:`);
  console.log(`- SMTP_HOST: ${smtpHost || '[not set]'}`);
  console.log(`- SMTP_PORT: ${smtpPort || '[not set]'}`);
  console.log(`- SMTP_USER: ${smtpUser ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? '[set]' : '[not set]'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  
  if (isSmtpConfigured) {
    console.log('✅ Legacy SMTP configuration is complete.');
  }
  
  // If no email method is configured, provide troubleshooting information
  if (!isGoogleConfigured && !isSmtpConfigured) {
    console.error('⚠️ No email configuration found. Email functionality will not work.');
    
    // In production, this is a critical error - provide more detailed troubleshooting
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: Production environment detected without email configuration!');
      console.error('This will prevent email delivery, including verification emails and password resets.');
      console.error('');
      console.error('Please configure EITHER Google Email OR Legacy SMTP:');
      console.error('');
      console.error('Option 1: Google Email (Recommended)');
      console.error('-----------------------------------');
      console.error('Set these environment variables:');
      console.error('- GOOGLE_EMAIL (e.g., noreply@yourdomain.com)');
      console.error('- GOOGLE_EMAIL_PASSWORD (your app password)');
      console.error('- GOOGLE_EMAIL_NAME (optional, e.g., "My Smart Scheduler")');
      console.error('');
      console.error('Run the test script:');
      console.error('node server/scripts/testGoogleEmailDelivery.js your-email@example.com');
      console.error('');
      console.error('Option 2: Legacy SMTP');
      console.error('-------------------');
      console.error('Set these environment variables:');
      console.error('FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE');
      console.error('');
      console.error('Run the test script:');
      console.error('node server/scripts/productionEmailDiagnostic.js your-email@example.com');
    }
  }
  
  // Log a summary of the configuration
  console.log('\n📋 EMAIL CONFIGURATION SUMMARY:');
  console.log(`- FROM_EMAIL: ${senderEmail}`);
  console.log(`- Google Email: ${isGoogleConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`- Legacy SMTP: ${isSmtpConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`- At least one method configured: ${(isGoogleConfigured || isSmtpConfigured) ? 'YES ✓' : 'NO ✗'}`);
}

// Run the check on startup
checkSmtpConfiguration();

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Result from sending an email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  method?: 'smtp' | 'ethereal';
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  smtpDiagnostics?: {
    configured: boolean;
    attempted: boolean;
    error?: string;
    host?: string;
    port?: number;
    user?: string;
    secure?: boolean;
  };
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
  sendEventReminder(event: Event, userEmail: string, minutesBefore: number): Promise<boolean>;
  sendBookingConfirmation(event: Event, hostEmail: string, guestEmail: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean>;
  sendEmailVerificationEmail(email: string, verifyLink: string): Promise<EmailSendResult>;
  getFromEmail(): string;
}

export class EmailService implements IEmailService {
  // Get FROM_EMAIL from environment or use default
  private readonly FROM_EMAIL: string;
  
  // Google Email Service - initialized lazily
  private googleEmailService: GoogleEmailService | null = null;
  
  constructor() {
    // Log environment identification to help with debugging
    console.log(`🔄 Email Service initializing in ${process.env.NODE_ENV || 'development'} environment`);
    console.log(`🕒 Server time: ${new Date().toISOString()}`);
    
    // Ensure FROM_EMAIL has both username and domain parts
    let fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
    
    // If email is missing username part (starts with @), add 'noreply'
    if (fromEmail.startsWith('@')) {
      fromEmail = 'noreply' + fromEmail;
      // Update the environment variable
      process.env.FROM_EMAIL = fromEmail;
      console.log(`⚠️ FROM_EMAIL was missing username part, normalized to: ${fromEmail}`);
    }
    
    this.FROM_EMAIL = fromEmail;
    
    // Enhanced environment variable logging
    console.log('📋 EMAIL SERVICE CONFIGURATION:');
    console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL ? `"${process.env.FROM_EMAIL}"` : 'not set'}`);
    console.log(`- NORMALIZED FROM_EMAIL: "${this.FROM_EMAIL}"`);
    console.log(`- SMTP_HOST: ${process.env.SMTP_HOST ? `"${process.env.SMTP_HOST}"` : 'not set'}`);
    
    // Check for Google Email configuration
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD) {
      console.log(`- GOOGLE_EMAIL: "${process.env.GOOGLE_EMAIL}"`);
      console.log(`- GOOGLE_EMAIL_PASSWORD: [set]`);
      console.log(`- GOOGLE_EMAIL_NAME: "${process.env.GOOGLE_EMAIL_NAME || ''}"`);
      console.log(`✅ Google Email configuration detected`);
    }
    
    console.log(`✅ Email service initialized with sender: ${this.FROM_EMAIL}`);
    
    // Initialize Google Email Service if configured
    this.initGoogleEmailService();
  }
  
  /**
   * Returns the normalized FROM_EMAIL
   */
  getFromEmail(): string {
    return this.FROM_EMAIL;
  }
  
  /**
   * Initializes the Google Email Service if credentials are provided
   */
  private initGoogleEmailService(): GoogleEmailService | null {
    // Return existing instance if already initialized
    if (this.googleEmailService) {
      return this.googleEmailService;
    }
    
    // Check for Google Email credentials in environment
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD) {
      console.log('🔄 Initializing Google Email Service...');
      
      this.googleEmailService = new GoogleEmailService({
        email: process.env.GOOGLE_EMAIL,
        password: process.env.GOOGLE_EMAIL_PASSWORD,
        name: process.env.GOOGLE_EMAIL_NAME || undefined
      });
      
      console.log('✅ Google Email Service initialized');
      
      // In production, verify connection immediately
      if (process.env.NODE_ENV === 'production') {
        this.googleEmailService.verifyConnection()
          .then(success => {
            if (success) {
              console.log('✅ Google Email connection verified successfully');
            } else {
              console.error('❌ Google Email connection verification failed');
            }
          })
          .catch(error => {
            console.error('❌ Error verifying Google Email connection:', error);
          });
      }
      
      return this.googleEmailService;
    }
    
    return null;
  }
  
  // Initialized lazily to avoid creating transport if not needed
  private nodemailerTransporter: nodemailer.Transporter | null = null;
  
  // Legacy SMTP initialization disabled - Google Email is used exclusively now
  private initNodemailer() {
    console.log('⚠️ Legacy SMTP has been disabled due to connection issues');
    console.log('- Using Google Email exclusively for email delivery');
    
    // If we're in production, guide the user toward Google Email setup
    if (process.env.NODE_ENV === 'production') {
      if (!(process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD)) {
        console.error('❌ ERROR: Google Email credentials not configured in production environment!');
        console.error('   Email delivery WILL NOT WORK without proper email settings.');
        console.error('');
        console.error('   To configure Google Email for production:');
        console.error('   Required environment variables:');
        console.error('   - GOOGLE_EMAIL (e.g., noreply@yourdomain.com)');
        console.error('   - GOOGLE_EMAIL_PASSWORD (your Google app password)');
        console.error('   - GOOGLE_EMAIL_NAME (optional, display name)');
        console.error('');
        console.error('   You can also run the test tool:');
        console.error('   node server/scripts/testGoogleEmailDelivery.js your-email@example.com');
      }
    } else {
      // For development, just use ethereal
      console.log('Legacy SMTP disabled, using Google Email or ethereal for testing (development only)');
    }
    
    return null;
  }

  /**
   * Sends an email using SMTP only
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to detailed email send result
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.log(`📧 Preparing to send email to ${options.to} with subject "${options.subject}"`);
    console.log(`- FROM_EMAIL: ${this.FROM_EMAIL}`);
    console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- SMTP configured: ${!!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)}`);
    console.log(`- Google Email configured: ${!!(process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD)}`);
    
    // PRODUCTION DEBUGGING ENHANCEMENTS: Log all environment variables for email configuration
    console.log('📧 DETAILED EMAIL CONFIGURATION [PRODUCTION DEBUG]:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
    console.log(`- FROM_EMAIL env var: ${process.env.FROM_EMAIL || 'Not set'}`);
    console.log(`- FROM_EMAIL normalized: ${this.FROM_EMAIL}`);
    
    // Log SMTP configuration if available
    if (process.env.SMTP_HOST) {
      console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
      console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
      console.log(`- SMTP_USER: ${process.env.SMTP_USER ? 'Set (hidden)' : 'Not set'}`);
      console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? 'Set (hidden)' : 'Not set'}`);
      console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || 'Not set'}`);
    }
    
    // Log Google Email configuration if available
    if (process.env.GOOGLE_EMAIL) {
      console.log(`- GOOGLE_EMAIL: ${process.env.GOOGLE_EMAIL}`);
      console.log(`- GOOGLE_EMAIL_PASSWORD: ${process.env.GOOGLE_EMAIL_PASSWORD ? 'Set (hidden)' : 'Not set'}`);
      console.log(`- GOOGLE_EMAIL_NAME: ${process.env.GOOGLE_EMAIL_NAME || 'Not set'}`);
    }
    
    let messageId: string | undefined;
    
    // Create a result object with diagnostics that we'll fill with details
    const result: EmailSendResult = {
      success: false,
      smtpDiagnostics: {
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        attempted: false,
        host: process.env.SMTP_HOST || undefined,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
        user: process.env.SMTP_USER || undefined,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
      },
      error: undefined,
      messageId: undefined,
      method: undefined
    };
    
    // STEP 1: Try Google Email service first if configured
    const googleService = this.initGoogleEmailService();
    if (googleService) {
      try {
        console.log('🔄 Attempting email delivery via Google Email service...');
        
        const googleResult = await googleService.sendEmail(options);
        
        // If successful, return the result
        if (googleResult.success) {
          console.log('✅ Google Email delivery successful');
          return googleResult;
        } else {
          console.error('❌ Google Email delivery failed:', googleResult.error?.message);
          
          // Store error but continue to try other methods
          result.error = googleResult.error;
        }
      } catch (error: any) {
        console.error('❌ Google Email service exception:', error.message);
      }
    }
    
    // STEP 2: Try loading SMTP config using our robust environment loader if not already configured
    if (!result.smtpDiagnostics?.configured) {
      console.log('⚠️ SMTP configuration not found in environment, attempting to load using environment loader');
      
      // Force reload environment with hardcoded defaults for production if needed
      const config = loadEnvironment();
      
      // Update diagnostics with newly loaded configuration
      result.smtpDiagnostics = {
        configured: config.isConfigured,
        attempted: false,
        host: process.env.SMTP_HOST || undefined,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
        user: process.env.SMTP_USER || undefined,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
      };
      
      console.log(`Updated SMTP configuration from environment loader: ${config.isConfigured ? 'SUCCESS' : 'FAILED'}`);
      
      // If we're in production and still not configured, output critical error
      if (!config.isConfigured && process.env.NODE_ENV === 'production' && !googleService) {
        console.error('❌ CRITICAL ERROR: Failed to load email configuration in production!');
        console.error('Email verification and password reset will not work.');
        console.error('');
        console.error('Please ensure your environment variables are correctly set:');
        console.error('FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE');
        console.error('OR');
        console.error('GOOGLE_EMAIL, GOOGLE_EMAIL_PASSWORD, GOOGLE_EMAIL_NAME (optional)');
      }
    }
    
    // STEP 3: Try directly using Gmail SMTP if Google Email service initialization failed
    if (!googleService) {
      // Check if we have Google Email credentials
      if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_EMAIL_PASSWORD) {
        console.log('🔄 Google Email service initialization failed but credentials exist');
        console.log('🔄 Attempting direct Gmail SMTP connection as fallback...');
        
        try {
          // Create direct Gmail transport
          const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GOOGLE_EMAIL,
              pass: process.env.GOOGLE_EMAIL_PASSWORD
            }
          });
          
          // Verify connection
          await transport.verify();
          console.log('✅ Direct Gmail SMTP connection verified successfully');
          
          // Send the email
          const info = await transport.sendMail({
            from: `"${process.env.GOOGLE_EMAIL_NAME || 'SmartScheduler'}" <${process.env.GOOGLE_EMAIL}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
          });
          
          console.log(`✅ Email sent directly via Gmail SMTP. MessageId: ${info.messageId}`);
          
          result.success = true;
          result.messageId = info.messageId;
          result.method = 'smtp';
          return result;
        } catch (error: any) {
          console.error('❌ Direct Gmail SMTP fallback failed:', error.message);
          result.error = {
            message: `Direct Gmail SMTP delivery failed: ${error.message}`,
            code: error.code || 'GMAIL_DIRECT_ERROR',
            details: error
          };
        }
      } else {
        console.log('⚠️ Google Email not configured, cannot send email in production');
        
        // Add error information to result
        result.error = {
          message: 'Google Email service not configured',
          code: 'GOOGLE_EMAIL_NOT_CONFIGURED',
          details: 'No email delivery method is available'
        };
      }
    } else {
      // If we got here with configured Google Email, it means the attempt failed
      if (!result.error) {
        result.error = {
          message: 'Google Email delivery failed with unknown error',
          code: 'GOOGLE_EMAIL_UNKNOWN_ERROR',
          details: 'Check logs for more details'
        };
      }
    }
    
    // STEP 4: If we're in development and other methods failed, try using Ethereal
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('🔄 Attempting to use Ethereal for email testing (development only)...');
        
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('Created ethereal email account for testing');
        
        const info = await transporter.sendMail({
          from: this.FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        
        console.log(`✅ Ethereal email sent for testing. MessageId: ${info.messageId}`);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
        result.success = true;
        result.messageId = info.messageId;
        result.method = 'ethereal';
        return result;
      } catch (error: any) {
        console.error('❌ Ethereal fallback failed:', error.message);
      }
    }
    
    // If we get here, all attempts failed
    console.error('❌ All email delivery methods failed');
    return result;
  }
  
  /**
   * Sends a reminder email for an upcoming event
   * @param event The event to send a reminder for
   * @param userEmail The email address of the user
   * @param minutesBefore Minutes before the event to send the reminder
   * @returns Promise resolving to success status
   */
  async sendEventReminder(event: Event, userEmail: string, minutesBefore: number): Promise<boolean> {
    const timePhrase = minutesBefore === 0 
      ? 'now starting' 
      : `starting in ${minutesBefore === 60 ? '1 hour' : minutesBefore + ' minutes'}`;
    
    // Format the event date in the user's timezone
    const formattedStartTime = timeZoneService.formatDateTime(
      new Date(event.startTime), 
      event.timezone || 'UTC', 
      '12h', 
      true
    );
    
    const subject = `Reminder: ${event.title} - ${timePhrase}`;
    
    const text = `
      Reminder: Your event "${event.title}" is ${timePhrase}.
      
      Event Details:
      - Start Time: ${formattedStartTime}
      - Location: ${event.location || 'No location specified'}
      ${event.description ? `- Description: ${event.description}` : ''}
      
      This is an automated reminder from My Smart Scheduler.
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Reminder</h2>
        <p style="font-size: 16px;">Your event <strong>${event.title}</strong> is ${timePhrase}.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #444;">Event Details</h3>
          <p><strong>Start Time:</strong> ${formattedStartTime}</p>
          <p><strong>Location:</strong> ${event.location || 'No location specified'}</p>
          ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
        </div>
        
        <p style="color: #777; font-size: 12px; margin-top: 30px;">
          This is an automated reminder from My Smart Scheduler.
        </p>
      </div>
    `;
    
    const result = await this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
    
    return result.success;
  }
  
  /**
   * Sends a booking confirmation email
   * @param booking The booking details
   * @param hostEmail The email of the host
   * @param guestEmail The email of the guest
   * @returns Promise resolving to success status
   */
  async sendBookingConfirmation(
    event: Event, 
    hostEmail: string, 
    guestEmail: string
  ): Promise<boolean> {
    // Format dates in appropriate timezone
    const formattedStartTime = timeZoneService.formatDateTime(
      new Date(event.startTime), 
      event.timezone || 'UTC', 
      '12h', 
      true
    );
    
    const formattedEndTime = timeZoneService.formatDateTime(
      new Date(event.endTime), 
      event.timezone || 'UTC', 
      '12h', 
      true
    );
    
    // Send confirmation to the host
    const hostSubject = `New Booking: ${event.title}`;
    const hostText = `
      A new booking has been made for "${event.title}".
      
      Booking Details:
      - Start: ${formattedStartTime}
      - End: ${formattedEndTime}
      - Guest: ${guestEmail}
      ${event.location ? `- Location: ${event.location}` : ''}
      ${event.description ? `- Notes: ${event.description}` : ''}
      
      This booking has been added to your calendar.
    `;
    
    const hostHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Booking Confirmation</h2>
        <p style="font-size: 16px;">A new booking has been made for <strong>${event.title}</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #444;">Booking Details</h3>
          <p><strong>Start:</strong> ${formattedStartTime}</p>
          <p><strong>End:</strong> ${formattedEndTime}</p>
          <p><strong>Guest:</strong> ${guestEmail}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
          ${event.description ? `<p><strong>Notes:</strong> ${event.description}</p>` : ''}
        </div>
        
        <p>This booking has been added to your calendar.</p>
        
        <p style="color: #777; font-size: 12px; margin-top: 30px;">
          This is an automated message from My Smart Scheduler.
        </p>
      </div>
    `;
    
    // Send confirmation to the guest
    const guestSubject = `Booking Confirmation: ${event.title}`;
    const guestText = `
      Your booking for "${event.title}" has been confirmed.
      
      Booking Details:
      - Start: ${formattedStartTime}
      - End: ${formattedEndTime}
      - Host: ${hostEmail}
      ${event.location ? `- Location: ${event.location}` : ''}
      ${event.description ? `- Notes: ${event.description}` : ''}
      
      This booking has been added to your calendar.
    `;
    
    const guestHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p style="font-size: 16px;">Your booking for <strong>${event.title}</strong> has been confirmed.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #444;">Booking Details</h3>
          <p><strong>Start:</strong> ${formattedStartTime}</p>
          <p><strong>End:</strong> ${formattedEndTime}</p>
          <p><strong>Host:</strong> ${hostEmail}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
          ${event.description ? `<p><strong>Notes:</strong> ${event.description}</p>` : ''}
        </div>
        
        <p>This booking has been added to your calendar.</p>
        
        <p style="color: #777; font-size: 12px; margin-top: 30px;">
          This is an automated message from My Smart Scheduler.
        </p>
      </div>
    `;
    
    // Send both emails
    const hostResult = await this.sendEmail({
      to: hostEmail,
      subject: hostSubject,
      text: hostText,
      html: hostHtml
    });
    
    const guestResult = await this.sendEmail({
      to: guestEmail,
      subject: guestSubject,
      text: guestText,
      html: guestHtml
    });
    
    // Return true only if both emails were sent successfully
    return hostResult.success && guestResult.success;
  }
  
  /**
   * Sends a password reset email
   * @param email The recipient's email address
   * @param resetLink The password reset link
   * @returns Promise resolving to success status
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    console.log(`Sending password reset email to ${email} with link ${resetLink}`);
    
    const subject = 'Reset Your Password';
    
    const text = getPasswordResetText(resetLink);
    const html = getPasswordResetHtml(resetLink);

    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html
      });
      
      if (result.success) {
        console.log(`✅ Password reset email successfully sent to ${email}`);
        console.log(`- Method: ${result.method || 'unknown'}`);
        console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      } else {
        console.error(`❌ Failed to send password reset email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
        
        if (result.smtpDiagnostics && result.smtpDiagnostics.attempted) {
          console.error(`- SMTP attempt failed: ${result.smtpDiagnostics.error || 'Unknown error'}`);
          console.error(`- SMTP host: ${result.smtpDiagnostics.host || 'unknown'}`);
          console.error(`- SMTP port: ${result.smtpDiagnostics.port || 'unknown'}`);
        }
      }
      
      return result.success;
    } catch (error: any) {
      console.error(`Unexpected error sending password reset email: ${error.message}`);
      console.error('Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Sends an email verification email
   * @param email The recipient's email address
   * @param verifyLink The verification link
   * @returns Promise resolving to email send result with detailed diagnostics
   */
  async sendEmailVerificationEmail(email: string, verifyLink: string): Promise<EmailSendResult> {
    console.log(`Sending email verification to ${email} with link ${verifyLink}`);
    
    const subject = 'Verify Your Email Address';
    
    const text = getEmailVerificationText(verifyLink);
    const html = getEmailVerificationHtml(verifyLink);
    
    // Attempt to send with detailed error tracking
    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html
      });
      
      if (result.success) {
        console.log(`✅ Verification email successfully sent to ${email}`);
      } else {
        console.error(`❌ Failed to send verification email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
        
        if (result.smtpDiagnostics && result.smtpDiagnostics.attempted) {
          console.error(`- SMTP attempt failed: ${result.smtpDiagnostics.error || 'Unknown error'}`);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error(`Unexpected error sending verification email: ${error.message}`);
      
      return {
        success: false,
        error: {
          message: `Unexpected error: ${error.message}`,
          details: error.stack
        }
      };
    }
  }
}

// Export a singleton instance for use throughout the application
export const emailService = new EmailService();