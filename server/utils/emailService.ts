import { Event } from '../../shared/schema';
import { timeZoneService } from './timeZoneService';
import { getPasswordResetHtml, getPasswordResetText, getEmailVerificationHtml, getEmailVerificationText } from './emailTemplates';
import { SendGridService } from './sendGridService';
import { getFromEmailForDomain, getBaseUrlForDomain } from './domainConfig';
import { generateUnsubscribeToken } from './unsubscribeToken';

// Canonical platform email domain and address. Any email-related env var that
// still points at a deprecated/old domain (e.g. from a stale committed .env
// file that cannot be edited) is rewritten to the canonical values at startup,
// so all outbound mail comes from noreply@smart-scheduler.ai.
const DEPRECATED_EMAIL_DOMAINS = ['mysmartscheduler.co'];
const CANONICAL_EMAIL_DOMAIN = 'smart-scheduler.ai';
const CANONICAL_FROM_EMAIL = `noreply@${CANONICAL_EMAIL_DOMAIN}`;

function rewriteDeprecatedEmail(value?: string): string | undefined {
  if (!value) return value;
  const lower = value.toLowerCase();
  if (!DEPRECATED_EMAIL_DOMAINS.some(domain => lower.includes(domain))) {
    return value;
  }
  // Preserve the local part (e.g. "noreply", "app") but swap the domain.
  const atIndex = value.indexOf('@');
  const localPart = atIndex > 0 ? value.slice(0, atIndex) : 'noreply';
  return `${localPart}@${CANONICAL_EMAIL_DOMAIN}`;
}

// Normalize all email-related env vars away from any deprecated domain. Runs
// before the email service initializes so every send path uses the new domain.
function normalizeEmailEnvVars() {
  for (const key of ['FROM_EMAIL', 'SMTP_FROM', 'SMTP_USER']) {
    const original = process.env[key];
    const rewritten = rewriteDeprecatedEmail(original);
    if (rewritten && rewritten !== original) {
      process.env[key] = rewritten;
      console.log(`⚠️ ${key} pointed at a deprecated domain; rewritten to ${rewritten}`);
    }
  }
}

normalizeEmailEnvVars();

// Function to check email configuration at startup
function checkEmailConfiguration() {
  console.log('📋 CHECKING EMAIL CONFIGURATION:');

  // Get FROM_EMAIL environment variable or fallback
  const fromEmail = process.env.FROM_EMAIL || CANONICAL_FROM_EMAIL;
  // If email is missing username part (starts with @), add 'noreply'
  const senderEmail = fromEmail.startsWith('@') ? 'noreply' + fromEmail : fromEmail;

  // Set the processed email as environment variable
  process.env.FROM_EMAIL = senderEmail;

  console.log('Sender email configured as:', senderEmail);

  // Check for SendGrid configuration
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const isSendGridConfigured = !!sendGridApiKey;

  if (isSendGridConfigured) {
    console.log(`\n📬 SENDGRID EMAIL CONFIGURATION:`);
    console.log(`- SENDGRID_API_KEY: [set]`);
    console.log(`- FROM_EMAIL: ${senderEmail}`);
    console.log('✅ SendGrid configuration is complete.');
  } else {
    console.error('⚠️ SendGrid not configured. Email functionality will not work.');

    // In production, this is a critical error
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: Production environment detected without SendGrid configuration!');
      console.error('This will prevent email delivery, including verification emails and password resets.');
      console.error('');
      console.error('Please configure SendGrid:');
      console.error('Set these environment variables:');
      console.error('- SENDGRID_API_KEY (your SendGrid API key)');
      console.error('- FROM_EMAIL (e.g., noreply@smart-scheduler.ai)');
      console.error('');
      console.error('Run the test script:');
      console.error('tsx server/utils/testSendGridConnectivity.ts');
    }
  }

}

// Run the check on startup
checkEmailConfiguration();

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string; // Optional: override the default FROM email for multi-domain support
  headers?: Record<string, string>; // Optional: extra SMTP headers (e.g. List-Unsubscribe)
}

/**
 * Result from sending an email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  method?: 'sendgrid' | 'ethereal' | 'smtp';
  smtpDiagnostics?: {
    configured: boolean;
    attempted: boolean;
    host: string;
    port: number;
    user: string;
    secure: boolean;
  };
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
  sendEventReminder(event: Event, userEmail: string, minutesBefore: number): Promise<boolean>;
  sendBookingConfirmation(event: Event, hostEmail: string, guestEmail: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, resetLink: string, domain?: string): Promise<boolean>;
  sendEmailVerificationEmail(email: string, verifyLink: string, domain?: string): Promise<EmailSendResult>;
  sendAccountCredentialsEmail(email: string, username: string, password: string, loginLink: string, domain?: string): Promise<EmailSendResult>;
  getFromEmail(): string;
  getFromEmailForDomain(domain?: string): string;
}

export class EmailService implements IEmailService {
  // Get FROM_EMAIL from environment or use default
  private readonly FROM_EMAIL: string;
  
  // SendGrid Email Service - initialized lazily
  private sendGridService: SendGridService | null = null;
  
  constructor() {
    // Log environment identification to help with debugging
    console.log(`🔄 Email Service initializing in ${process.env.NODE_ENV || 'development'} environment`);
    console.log(`🕒 Server time: ${new Date().toISOString()}`);
    
    // Ensure FROM_EMAIL has both username and domain parts
    let fromEmail = process.env.FROM_EMAIL || 'noreply@smart-scheduler.ai';

    // Never send from a deprecated/old domain, even if a stale committed .env
    // value points at it. Fall back to the canonical sender address.
    if (fromEmail.toLowerCase().includes('mysmartscheduler.co')) {
      console.log(`⚠️ FROM_EMAIL pointed at deprecated domain (${fromEmail}); using canonical noreply@smart-scheduler.ai`);
      fromEmail = 'noreply@smart-scheduler.ai';
      process.env.FROM_EMAIL = fromEmail;
    }
    
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
    // Check for SendGrid configuration
    if (process.env.SENDGRID_API_KEY) {
      console.log(`- SENDGRID_API_KEY: [set]`);
      console.log(`✅ SendGrid configuration detected`);
    }
    
    console.log(`✅ Email service initialized with sender: ${this.FROM_EMAIL}`);
    
    // Initialize SendGrid Email Service if configured
    this.initSendGridService();
  }
  
  /**
   * Returns the normalized FROM_EMAIL
   */
  getFromEmail(): string {
    return this.FROM_EMAIL;
  }

  /**
   * Returns the FROM email for a specific domain
   * Uses domain-aware configuration for multi-domain support
   */
  getFromEmailForDomain(domain?: string): string {
    return getFromEmailForDomain(domain) || this.FROM_EMAIL;
  }

  /**
   * Initializes the SendGrid Email Service if API key is provided
   */
  private initSendGridService(): SendGridService | null {
    // Return existing instance if already initialized
    if (this.sendGridService) {
      return this.sendGridService;
    }
    
    // Check for SendGrid API key in environment
    if (process.env.SENDGRID_API_KEY) {
      console.log('🔄 Initializing SendGrid Email Service...');
      
      this.sendGridService = new SendGridService({
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: this.FROM_EMAIL,
        fromName: 'SmartScheduler'
      });
      
      console.log('✅ SendGrid Email Service initialized');
      
      // In production, verify connection immediately
      if (process.env.NODE_ENV === 'production') {
        this.sendGridService.verifyConnection()
          .then(success => {
            if (success) {
              console.log('✅ SendGrid connection verified successfully');
            } else {
              console.error('❌ SendGrid connection verification failed');
            }
          })
          .catch(error => {
            console.error('❌ Error verifying SendGrid connection:', error);
          });
      }
      
      return this.sendGridService;
    }
    
    return null;
  }
  

  /**
   * Sends an email using SendGrid
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to detailed email send result
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.log(`📧 Preparing to send email to ${options.to} with subject "${options.subject}"`);
    console.log(`- FROM_EMAIL: ${this.FROM_EMAIL}`);
    console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- SendGrid configured: [REDACTED]`);

    // Create a result object that we'll fill with details
    const result: EmailSendResult = {
      success: false,
      error: undefined,
      messageId: undefined,
      method: undefined
    };

    // Try SendGrid service if configured
    const sendGridService = this.initSendGridService();
    if (sendGridService) {
      try {
        console.log('🔄 Attempting email delivery via SendGrid...');

        const sendGridResult = await sendGridService.sendEmail(options);

        // If successful, return the result
        if (sendGridResult.success) {
          console.log('✅ SendGrid email delivery successful');
          return sendGridResult;
        } else {
          console.error('❌ SendGrid email delivery failed:', sendGridResult.error?.message);
          result.error = sendGridResult.error;
        }
      } catch (error: any) {
        console.error('❌ SendGrid service exception:', error.message);
        result.error = {
          message: `SendGrid exception: ${error.message}`,
          code: 'SENDGRID_EXCEPTION',
          details: error.stack
        };
      }
    } else {
      // SendGrid not configured
      console.error('❌ SendGrid not configured');

      if (process.env.NODE_ENV === 'production') {
        console.error('❌ CRITICAL ERROR: SendGrid not configured in production!');
        console.error('Email verification and password reset will not work.');
        console.error('');
        console.error('Required environment variables:');
        console.error('- SENDGRID_API_KEY (your SendGrid API key)');
        console.error('- FROM_EMAIL (e.g., noreply@smart-scheduler.ai)');
      }

      result.error = {
        message: 'SendGrid service not configured',
        code: 'SENDGRID_NOT_CONFIGURED',
        details: 'SENDGRID_API_KEY environment variable is required'
      };
    }

    // If we get here in production, email failed
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Email delivery failed');
      return result;
    }

    // In development only: If SendGrid failed/not configured, provide helpful message
    // Note: We don't fall back to Ethereal automatically to encourage proper configuration
    console.warn('⚠️ Email not sent - configure SENDGRID_API_KEY environment variable');
    console.warn('   For development testing, you can use:');
    console.warn('   tsx server/utils/testSendGridConnectivity.ts');

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

    // Notification emails are unsubscribable (transactional emails are not).
    // Build a one-click, no-login unsubscribe link for this user.
    const unsubscribeUrl = `${getBaseUrlForDomain()}/api/unsubscribe?token=${generateUnsubscribeToken(event.userId)}`;

    const text = `
      Reminder: Your event "${event.title}" is ${timePhrase}.

      Event Details:
      - Start Time: ${formattedStartTime}
      - Location: ${event.location || 'No location specified'}
      ${event.description ? `- Description: ${event.description}` : ''}

      This is an automated reminder from My Smart Scheduler.
      Unsubscribe from reminder emails: ${unsubscribeUrl}
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
          This is an automated reminder from My Smart Scheduler.<br>
          <a href="${unsubscribeUrl}" style="color: #777;">Unsubscribe from reminder emails</a>
        </p>
      </div>
    `;

    const result = await this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
      headers: {
        // RFC 8058 one-click unsubscribe (required by bulk-sender rules).
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
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
  async sendPasswordResetEmail(email: string, resetLink: string, domain?: string): Promise<boolean> {
    console.log(`Sending password reset email to ${email} with link ${resetLink}`);
    if (domain) {
      console.log(`Using domain-aware FROM email for domain: ${domain}`);
    }

    const subject = 'Reset Your Password';

    const text = getPasswordResetText(resetLink);
    const html = getPasswordResetHtml(resetLink);

    // Use domain-aware FROM email for multi-domain support
    const fromEmail = domain ? this.getFromEmailForDomain(domain) : undefined;

    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html,
        from: fromEmail
      });
      
      if (result.success) {
        console.log(`✅ Password reset email successfully sent to ${email}`);
        console.log(`- Method: ${result.method || 'sendgrid'}`);
        console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      } else {
        console.error(`❌ Failed to send password reset email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
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
   * @param domain Optional domain for multi-domain support
   * @returns Promise resolving to email send result with detailed diagnostics
   */
  async sendEmailVerificationEmail(email: string, verifyLink: string, domain?: string): Promise<EmailSendResult> {
    console.log(`Sending email verification to ${email} with link ${verifyLink}`);
    if (domain) {
      console.log(`Using domain-aware FROM email for domain: ${domain}`);
    }

    const subject = 'Verify Your Email Address';

    const text = getEmailVerificationText(verifyLink);
    const html = getEmailVerificationHtml(verifyLink);

    // Use domain-aware FROM email for multi-domain support
    const fromEmail = domain ? this.getFromEmailForDomain(domain) : undefined;

    // Attempt to send with detailed error tracking
    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html,
        from: fromEmail
      });
      
      if (result.success) {
        console.log(`✅ Verification email successfully sent to ${email}`);
      } else {
        console.error(`❌ Failed to send verification email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
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

  /**
   * Sends account credentials email to a new user
   * @param email The recipient's email address
   * @param username The user's username
   * @param password The user's password (will be sent in plaintext)
   * @param loginLink The login page URL
   * @param domain Optional domain for multi-domain support
   * @returns Promise resolving to email send result with detailed diagnostics
   */
  async sendAccountCredentialsEmail(
    email: string,
    username: string,
    password: string,
    loginLink: string,
    domain?: string
  ): Promise<EmailSendResult> {
    console.log(`Sending account credentials email to ${email}`);
    if (domain) {
      console.log(`Using domain-aware FROM email for domain: ${domain}`);
    }

    const subject = 'Your SmartScheduler Account Credentials';

    const text = `
Welcome to SmartScheduler!

Your account has been created. Here are your login credentials:

Username: ${username}
Email: ${email}
Password: ${password}

Please log in at: ${loginLink}

IMPORTANT: For security reasons, you will be required to change your password when you first log in.

If you did not expect this email, please contact your administrator.

Best regards,
The SmartScheduler Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SmartScheduler Account</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SmartScheduler!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Your account has been created. Here are your login credentials:</p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${username}</p>
      <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Password:</strong> <code style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 14px;">${password}</code></p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Log In Now</a>
    </div>

    <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>Important:</strong> For security reasons, you will be required to change your password when you first log in.
      </p>
    </div>

    <p style="color: #666; font-size: 14px; margin-bottom: 10px;">If you did not expect this email, please contact your administrator.</p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Best regards,<br>
      The SmartScheduler Team
    </p>
  </div>
</body>
</html>
    `.trim();

    // Use domain-aware FROM email for multi-domain support
    const fromEmail = domain ? this.getFromEmailForDomain(domain) : undefined;

    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html,
        from: fromEmail
      });

      if (result.success) {
        console.log(`✅ Account credentials email successfully sent to ${email}`);
        console.log(`- Method: ${result.method || 'sendgrid'}`);
        console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      } else {
        console.error(`❌ Failed to send account credentials email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
      }

      return result;
    } catch (error: any) {
      console.error(`Unexpected error sending account credentials email: ${error.message}`);

      return {
        success: false,
        error: {
          message: `Unexpected error: ${error.message}`,
          details: error.stack
        }
      };
    }
  }

  /**
   * Sends an invitation email inviting someone to create an account.
   * @param email The recipient's email address
   * @param inviteLink The one-time accept-invite link where they set their password
   * @param options Optional metadata to personalize the email
   * @param domain Optional domain for multi-domain support
   * @returns Promise resolving to email send result with detailed diagnostics
   */
  async sendInvitationEmail(
    email: string,
    inviteLink: string,
    options?: { inviterName?: string; isComped?: boolean; expiresAt?: Date },
    domain?: string
  ): Promise<EmailSendResult> {
    console.log(`Sending invitation email to ${email}`);
    if (domain) {
      console.log(`Using domain-aware FROM email for domain: ${domain}`);
    }

    const inviterName = options?.inviterName || 'A SmartScheduler administrator';
    const expiryText = options?.expiresAt
      ? `This invitation expires on ${options.expiresAt.toLocaleString()}.`
      : 'This invitation will expire soon.';
    const isComped = options?.isComped ?? false;

    const subject = "You've been invited to SmartScheduler";

    const betaDisclaimerText = isComped ? `
--- COMPLIMENTARY BETA ACCESS — PLEASE READ ---

You have been granted complimentary access to Smart Scheduler as an invited beta participant. Your account is provided free of charge in exchange for your active and ongoing engagement in helping shape the platform.

As a beta participant, you are expected to:

  • Provide regular feedback — Share your experience, report issues, and flag gaps as you use the platform. Your input is the primary currency of this arrangement.
  • Participate in community feedback — Engage with the Smart Scheduler community and team to help prioritize the features and improvements that matter most in enterprise environments.
  • Complete periodic feedback requests — We may ask for your input on specific features or your overall experience. These responses directly influence our product roadmap.

Why your feedback matters: Smart Scheduler is on a deliberate path toward enterprise-grade excellence. Real-world feedback from engaged users like you is something no internal team can replicate. The insights you share help close the gap between a capable scheduling tool and a truly enterprise-ready platform.

This complimentary access is extended in good faith. We ask that you engage in kind — not as a passive user, but as an active contributor to building something great for the broader community.

Note: This is a non-paying account. No charges will be applied. Beta access is reviewed periodically and may be modified based on continued participation.
------------------------------------------------
` : '';

    const text = `
You've been invited to SmartScheduler!

${inviterName} has invited you to create a SmartScheduler account.
${betaDisclaimerText}
To accept your invitation and set your password, visit:
${inviteLink}

${expiryText}

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The SmartScheduler Team
    `.trim();

    const betaDisclaimerHtml = isComped ? `
    <div style="background: #f0f7ff; border: 1px solid #bcd4f0; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 15px; font-weight: bold;">Your Complimentary Beta Access — Please Read</p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        You have been granted complimentary access to Smart Scheduler as an invited beta participant. Your account is provided <strong>free of charge</strong> in exchange for your active and ongoing engagement in helping shape the platform.
      </p>
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: bold;">As a beta participant, you are expected to:</p>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        <li><strong>Provide regular feedback</strong> — Share your experience, report issues, and flag gaps as you use the platform. Your input is the primary currency of this arrangement.</li>
        <li><strong>Participate in community feedback</strong> — Engage with the Smart Scheduler community and team to help prioritize features that matter most in enterprise environments.</li>
        <li><strong>Complete periodic feedback requests</strong> — We may ask for your input on specific features or your overall experience. These responses directly influence our product roadmap.</li>
      </ul>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        <strong>Why your feedback matters:</strong> Smart Scheduler is on a deliberate path toward enterprise-grade excellence. Real-world feedback from engaged users like you is something no internal team can replicate. The insights you share help close the gap between a capable scheduling tool and a truly enterprise-ready platform.
      </p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        This complimentary access is extended in good faith. We ask that you engage in kind — not as a passive user, but as an active contributor to building something great for the broader community.
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic; border-top: 1px solid #bcd4f0; padding-top: 10px;">
        This is a non-paying account. No charges will be applied. Beta access is reviewed periodically and may be modified based on continued participation.
      </p>
    </div>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to SmartScheduler</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">${inviterName} has invited you to create a SmartScheduler account.</p>

    ${betaDisclaimerHtml}

    <p style="font-size: 16px; margin-bottom: 20px;">Click the button below to accept your invitation and choose your password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${expiryText}</p>

    <p style="color: #666; font-size: 14px; margin-bottom: 10px;">If you did not expect this invitation, you can safely ignore this email.</p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Best regards,<br>
      The SmartScheduler Team
    </p>
  </div>
</body>
</html>
    `.trim();

    // Use domain-aware FROM email for multi-domain support
    const fromEmail = domain ? this.getFromEmailForDomain(domain) : undefined;

    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        text,
        html,
        from: fromEmail
      });

      if (result.success) {
        console.log(`✅ Invitation email successfully sent to ${email}`);
        console.log(`- Method: ${result.method || 'sendgrid'}`);
        console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      } else {
        console.error(`❌ Failed to send invitation email to ${email}`);
        console.error('Error:', result.error?.message || 'Unknown error');
      }

      return result;
    } catch (error: any) {
      console.error(`Unexpected error sending invitation email: ${error.message}`);

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