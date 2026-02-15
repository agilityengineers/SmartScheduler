import { Event } from '../../shared/schema';
import { timeZoneService } from './timeZoneService';
import { getPasswordResetHtml, getPasswordResetText, getEmailVerificationHtml, getEmailVerificationText } from './emailTemplates';
import { SendGridService } from './sendGridService';
import { getFromEmailForDomain } from './domainConfig';

// Function to check email configuration at startup
function checkEmailConfiguration() {
  console.log('📋 CHECKING EMAIL CONFIGURATION:');

  // Get FROM_EMAIL environment variable or fallback
  const fromEmail = process.env.FROM_EMAIL || 'noreply@smart-scheduler.ai';
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

  // Log a summary of the configuration
  console.log('\n📋 EMAIL CONFIGURATION SUMMARY:');
  console.log(`- FROM_EMAIL: ${senderEmail}`);
  console.log(`- SendGrid: ${isSendGridConfigured ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
  console.log(`- Email delivery available: ${isSendGridConfigured ? 'YES ✓' : 'NO ✗'}`);
}

// Run the check on startup
checkEmailConfiguration();

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string; // Optional: override the default FROM email for multi-domain support
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
    console.log(`- SendGrid configured: ${!!(process.env.SENDGRID_API_KEY)}`);

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
}

// Export a singleton instance for use throughout the application
export const emailService = new EmailService();