import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { Event } from '../../shared/schema';
import { timeZoneService } from './timeZoneService';
import { getPasswordResetHtml, getPasswordResetText, getEmailVerificationHtml, getEmailVerificationText } from './emailTemplates';

// Initialize SendGrid with API key
const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
sgMail.setApiKey(sendgridApiKey);

// Configure SendGrid client to avoid Duplicate Content-Length error
// @ts-ignore - Access internal client configuration
if (sgMail.client && sgMail.client.client && sgMail.client.client.defaultRequest) {
  // @ts-ignore - Accessing private API to fix headers
  sgMail.client.client.defaultRequest.headers = {
    'User-Agent': 'sendgrid-nodejs',
    Authorization: `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json',
  };
  console.log('Configured SendGrid client to prevent header duplication issues');
}

// Function to test SendGrid configuration
async function testSendGridConfiguration() {
  try {
    // If no API key, don't attempt test
    if (!sendgridApiKey) {
      console.error('SENDGRID_API_KEY is not set. Email functionality will not work correctly.');
      return;
    }
    
    console.log('SendGrid API key is configured:', sendgridApiKey.substring(0, 5) + '...' + sendgridApiKey.substring(sendgridApiKey.length - 5));
    console.log('SendGrid API key length:', sendgridApiKey.length);
    
    // Get FROM_EMAIL environment variable or fallback
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
    // If email is missing username part (starts with @), add 'noreply'
    const senderEmail = fromEmail.startsWith('@') ? 'noreply' + fromEmail : fromEmail;
    
    console.log('Sender email configured as:', senderEmail);
    
    // Test API key permissions by calling a lighter-weight API
    try {
      const response = await fetch('https://api.sendgrid.com/v3/scopes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const scopes = await response.json();
        console.log('SendGrid API key permissions:', scopes);
        
        // Check if mail.send permission is included
        const hasMailSendPermission = Array.isArray(scopes.scopes) && 
          scopes.scopes.includes('mail.send');
          
        if (!hasMailSendPermission) {
          console.error('WARNING: SendGrid API key does not have mail.send permission!');
        } else {
          console.log('SendGrid API key has mail.send permission.');
        }
      } else {
        console.error('Failed to check SendGrid API key permissions:', 
          response.status, await response.text());
      }
    } catch (error) {
      console.error('Error checking SendGrid API key permissions:', error);
    }
    
  } catch (error) {
    console.error('Error testing SendGrid configuration:', error);
  }
}

// Run the test on startup
testSendGridConfiguration();

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  sendgridOptions?: {
    tracking_settings?: {
      click_tracking?: {
        enable: boolean;
        enable_text?: boolean;
      };
      open_tracking?: {
        enable: boolean;
      };
    };
  };
}

/**
 * Result from sending an email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  method?: 'smtp' | 'sendgrid' | 'fallback';
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
  sendgridDiagnostics?: {
    configured: boolean;
    attempted: boolean;
    error?: string;
    statusCode?: number;
    errors?: any[];
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
  
  constructor() {
    // Log environment identification to help with debugging
    console.log(`🔄 Email Service initializing in ${process.env.NODE_ENV || 'development'} environment`);
    console.log(`🕒 Server time: ${new Date().toISOString()}`);
    
    // Ensure FROM_EMAIL has both username and domain parts
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mysmartscheduler.co';
    
    // If email is missing username part (starts with @), add 'noreply'
    if (fromEmail.startsWith('@')) {
      this.FROM_EMAIL = 'noreply' + fromEmail;
    } else {
      this.FROM_EMAIL = fromEmail;
    }
    
    // Enhanced environment variable logging
    console.log('📋 EMAIL SERVICE CONFIGURATION:');
    console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- FROM_EMAIL: ${process.env.FROM_EMAIL ? `"${process.env.FROM_EMAIL}"` : 'not set'}`);
    console.log(`- NORMALIZED FROM_EMAIL: "${this.FROM_EMAIL}"`);
    console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'set' : 'not set'} (length: ${process.env.SENDGRID_API_KEY?.length || 0})`);
    console.log(`- SMTP_HOST: ${process.env.SMTP_HOST ? `"${process.env.SMTP_HOST}"` : 'not set'}`);
    
    console.log(`✅ Email service initialized with sender: ${this.FROM_EMAIL}`);
  }
  
  /**
   * Returns the normalized FROM_EMAIL
   */
  getFromEmail(): string {
    return this.FROM_EMAIL;
  }
  
  // Initialized lazily to avoid creating transport if not needed
  private nodemailerTransporter: nodemailer.Transporter | null = null;
  
  // Initialize the nodemailer transporter for fallback
  private initNodemailer() {
    if (this.nodemailerTransporter) {
      return this.nodemailerTransporter;
    }

    // Check for SMTP credentials
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    // If we have SMTP credentials, create an SMTP transport
    if (smtpHost && smtpUser && smtpPass) {
      // Production SMTP configuration with enhanced logging
      console.log(`🔄 Setting up SMTP transport with host: ${smtpHost}, port: ${smtpPort}, secure: ${smtpSecure}`);
      
      // Create transport with connection pool and retry options
      this.nodemailerTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Production-ready settings
        pool: true, // Use pooled connections
        maxConnections: 5, // Maximum number of connections
        maxMessages: 100, // Maximum number of messages per connection
        // Set a timeout
        connectionTimeout: 10000, // Timeout for TCP connection - 10 seconds
        socketTimeout: 30000, // Timeout for SMTP commands - 30 seconds
        // Retry sending on temporary errors
        tls: {
          // Don't fail on invalid certs
          rejectUnauthorized: false
        }
      });
      
      console.log(`✅ Initialized SMTP transport with host: ${smtpHost} (${smtpPort})`);
      
      // For production, verify SMTP connection immediately to detect issues
      if (process.env.NODE_ENV === 'production') {
        this.nodemailerTransporter.verify((error) => {
          if (error) {
            console.error('❌ SMTP Connection Error:', error.message);
            console.error('   This might cause email delivery issues in production!');
          } else {
            console.log('✅ SMTP server connection verified successfully');
          }
        });
      }
      
      return this.nodemailerTransporter;
    }
    
    // In production, warn loudly about missing SMTP settings
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ WARNING: SMTP credentials not configured in production environment!');
      console.warn('   Email delivery may be unreliable without proper SMTP settings.');
      console.warn('   Required environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
      console.warn('   Optional environment variables: SMTP_PORT, SMTP_SECURE');
    } else {
      // For development, just use ethereal
      console.log('No SMTP credentials found, using ethereal email for testing (development only)');
    }
    
    return null;
  }

  /**
   * Attempts to send email via nodemailer as fallback
   * @param options Email options
   * @returns Promise resolving to success status
   */
  private async sendEmailViaNodemailer(options: EmailOptions): Promise<boolean> {
    try {
      let transporter = this.initNodemailer();
      
      // If we couldn't initialize a transporter with credentials, create an ethereal one
      if (!transporter) {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('Created ethereal email account for testing');
      }
      
      const info = await transporter.sendMail({
        from: this.FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      
      console.log(`Nodemailer fallback email sent to ${options.to}. MessageId: ${info.messageId}`);
      
      // If using ethereal, log the URL to view the email (for development)
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (error) {
      console.error('Nodemailer fallback failed:', error);
      return false;
    }
  }

    // EmailSendResult interface is defined at the module level

  /**
   * Sends an email using SMTP with SendGrid as fallback
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to detailed email send result
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.log(`📧 Preparing to send email to ${options.to} with subject "${options.subject}"`);
    console.log(`- FROM_EMAIL: ${this.FROM_EMAIL}`);
    console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- SMTP configured: ${!!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)}`);
    console.log(`- SendGrid configured: ${!!process.env.SENDGRID_API_KEY}`);
    
    // PRODUCTION DEBUGGING ENHANCEMENTS: Log all environment variables for email configuration
    console.log('📧 DETAILED EMAIL CONFIGURATION [PRODUCTION DEBUG]:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
    console.log(`- FROM_EMAIL env var: ${process.env.FROM_EMAIL || 'Not set'}`);
    console.log(`- FROM_EMAIL normalized: ${this.FROM_EMAIL}`);
    console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
    console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
    console.log(`- SMTP_USER: ${process.env.SMTP_USER ? 'Set (hidden)' : 'Not set'}`);
    console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? 'Set (hidden)' : 'Not set'}`);
    console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE || 'Not set'}`);
    console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? `Set (length: ${process.env.SENDGRID_API_KEY.length})` : 'Not set'}`);
    
    let smtpResult = false;
    let sendGridResult = false;
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
      sendgridDiagnostics: {
        configured: !!process.env.SENDGRID_API_KEY,
        attempted: false
      },
      error: undefined,
      messageId: undefined,
      method: undefined
    };
    
    // First try SMTP as the primary method
    if (result.smtpDiagnostics && result.smtpDiagnostics.configured) {
      try {
        console.log('🔄 Attempting email delivery via SMTP (primary method)...');
        if (result.smtpDiagnostics) {
          result.smtpDiagnostics.attempted = true;
        }
        
        // Initialize nodemailer transport
        const transporter = this.initNodemailer();
        
        if (transporter) {
          const info = await transporter.sendMail({
            from: this.FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
          });
          
          console.log(`✅ SMTP delivery successful to ${options.to}`);
          console.log(`- Message ID: ${info.messageId}`);
          messageId = info.messageId;
          
          // If using ethereal, log the URL to view the email (for development)
          if (info.messageId && info.messageId.includes('ethereal')) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
          }
          
          // Record success
          smtpResult = true;
          result.success = true;
          result.messageId = messageId;
          result.method = 'smtp';
        } else {
          console.error('❌ SMTP transport initialization failed');
          smtpResult = false;
          result.smtpDiagnostics.error = 'SMTP transport initialization failed';
        }
      } catch (error: any) {
        console.error('❌ SMTP delivery exception:', error.message);
        smtpResult = false;
        result.smtpDiagnostics.error = error.message;
        
        // Add detailed diagnostic information
        if (error.code) {
          console.error(`SMTP Error Code: ${error.code}`);
          result.error = {
            message: error.message,
            code: error.code,
            details: error.response || error.stack
          };
        }
      }
    } else {
      console.log('⚠️ SMTP not configured, skipping SMTP delivery attempt');
    }
    
    // If SMTP succeeds, return without trying SendGrid
    if (smtpResult) {
      return result;
    }
    
    // Try SendGrid as fallback if SMTP failed or isn't configured
    if (result.sendgridDiagnostics && result.sendgridDiagnostics.configured) {
      try {
        console.log('🔄 Attempting email delivery via SendGrid (fallback method)...');
        console.log(`- Using sender: ${this.FROM_EMAIL}`);
        console.log(`- SENDGRID_API_KEY length: ${process.env.SENDGRID_API_KEY?.length || 0}`);
        
        if (result.sendgridDiagnostics) {
          result.sendgridDiagnostics.attempted = true;
        }
        
        // Create SendGrid message in proper v3 API format
        const sendgridPayload: any = {
          personalizations: [
            {
              to: Array.isArray(options.to) 
                ? options.to.map(email => ({ email })) 
                : [{ email: options.to }],
              subject: options.subject
            }
          ],
          from: { email: this.FROM_EMAIL },
          content: [
            {
              type: 'text/plain',
              value: options.text
            },
            {
              type: 'text/html',
              value: options.html
            }
          ]
        };
        
        // Add any custom SendGrid options if provided
        if (options.sendgridOptions) {
          // Merge tracking settings if provided
          if (options.sendgridOptions.tracking_settings) {
            sendgridPayload.tracking_settings = options.sendgridOptions.tracking_settings;
          }
        }
        
        // Use fetch API directly with correct API format
        const fetchResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sendgridPayload)
        });
        
        if (result.sendgridDiagnostics) {
          result.sendgridDiagnostics.statusCode = fetchResponse.status;
        }
        
        // Process response
        if (fetchResponse.ok) {
          console.log(`✅ SendGrid delivery accepted (status ${fetchResponse.status})`);
          messageId = fetchResponse.headers.get('x-message-id') || undefined;
          if (messageId) {
            console.log(`- Message ID: ${messageId}`);
          } else {
            console.warn(`⚠️ SendGrid response missing message ID, this might indicate delivery issues`);
          }
          sendGridResult = true;
          result.success = true;
          result.messageId = messageId;
          result.method = 'sendgrid';
        } else {
          // Handle error response
          const errorBody = await fetchResponse.json().catch(() => null) || await fetchResponse.text();
          console.error(`❌ SendGrid API error (${fetchResponse.status}):`, errorBody);
          
          // Add diagnostic information
          if (result.sendgridDiagnostics) {
            result.sendgridDiagnostics.error = `SendGrid API error (${fetchResponse.status})`;
            
            // Parse and log specific SendGrid error codes if available
            if (errorBody && typeof errorBody === 'object' && Array.isArray(errorBody.errors)) {
              result.sendgridDiagnostics.errors = errorBody.errors;
              
              errorBody.errors.forEach((err: any, index: number) => {
              console.error(`SendGrid Error #${index + 1}:`, {
                message: err.message,
                field: err.field,
                errorCode: err.error_id || err.code,
                help: err.help
              });
              
              // Specific handling for common errors
              if (err.message?.includes('domain')) {
                console.error('DOMAIN AUTHENTICATION ERROR: The sender domain might not be properly authenticated in SendGrid');
                result.error = {
                  message: 'DOMAIN AUTHENTICATION ERROR: The sender domain might not be properly authenticated in SendGrid',
                  code: err.error_id || err.code,
                  details: err
                };
              } else if (err.message?.includes('permission')) {
                console.error('PERMISSION ERROR: The SendGrid API key might not have the required permissions');
                result.error = {
                  message: 'PERMISSION ERROR: The SendGrid API key might not have the required permissions',
                  code: err.error_id || err.code,
                  details: err
                };
              } else if (err.message?.includes('rate limit')) {
                console.error('RATE LIMIT ERROR: SendGrid API rate limits exceeded');
                result.error = {
                  message: 'RATE LIMIT ERROR: SendGrid API rate limits exceeded',
                  code: err.error_id || err.code,
                  details: err
                };
              } else {
                // Generic error fallback
                result.error = {
                  message: err.message || 'Unknown SendGrid error',
                  code: err.error_id || err.code,
                  details: err
                };
              }
            });
            } else {
              // For non-structured error responses
              result.error = {
                message: 'SendGrid API error',
                code: fetchResponse.status.toString(),
                details: errorBody
              };
            }
          }
          
          sendGridResult = false;
        }
      } catch (error: any) {
        console.error('❌ SendGrid delivery exception:', error.message);
        sendGridResult = false;
        if (result.sendgridDiagnostics) {
          result.sendgridDiagnostics.error = error.message;
        }
        result.error = {
          message: error.message,
          details: error.stack
        };
      }
    } else {
      console.log('⚠️ SendGrid not configured, cannot attempt fallback delivery');
    }
    
    // Log overall status
    if (smtpResult || sendGridResult) {
      console.log('🎉 Email delivery successful through at least one method');
      console.log(`- SMTP (primary): ${smtpResult ? 'SUCCESS' : 'FAILED'}`);
      console.log(`- SendGrid (fallback): ${sendGridResult ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } else {
      console.error('❌ All email delivery methods failed');
      
      // If no specific error was set earlier, set a generic one
      if (!result.error) {
        result.error = {
          message: 'All email delivery methods failed',
          details: {
            smtpConfigured: result.smtpDiagnostics && result.smtpDiagnostics.configured,
            smtpError: result.smtpDiagnostics && result.smtpDiagnostics.error,
            sendgridConfigured: result.sendgridDiagnostics && result.sendgridDiagnostics.configured,
            sendgridError: result.sendgridDiagnostics && result.sendgridDiagnostics.error
          }
        };
      }
      
      return result;
    }
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
    const hostEmailResult = await this.sendEmail({
      to: hostEmail,
      subject: hostSubject,
      text: hostText,
      html: hostHtml
    });
    
    const guestEmailResult = await this.sendEmail({
      to: guestEmail,
      subject: guestSubject,
      text: guestText,
      html: guestHtml
    });
    
    return hostEmailResult.success && guestEmailResult.success;
  }
  
  /**
   * Sends a password reset email
   * @param email The recipient email address
   * @param resetLink The password reset link
   * @returns Promise resolving to success status
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset Your Password - My Smart Scheduler';
    
    const text = getPasswordResetText(resetLink);
    const html = getPasswordResetHtml(resetLink);
    
    const result = await this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
    
    return result.success;
  }
  
  /**
   * Sends an email verification email
   * @param email The recipient email address
   * @param verifyLink The email verification link
   * @returns Promise resolving to EmailSendResult with detailed delivery information
   */
  async sendEmailVerificationEmail(email: string, verifyLink: string): Promise<EmailSendResult> {
    const subject = 'Verify Your Email - My Smart Scheduler';
    
    const text = getEmailVerificationText(verifyLink);
    const html = getEmailVerificationHtml(verifyLink);
    
    console.log('📧 VERIFICATION EMAIL SENDING:');
    console.log(`- Recipient: ${email}`);
    console.log(`- Link: ${verifyLink}`);
    
    // For verification emails, we'll use our enhanced email sending method
    // but with tracking disabled to prevent link mangling
    
    // Create a payload specifically for SendGrid with tracking disabled
    const sendgridOptions = {
      tracking_settings: {
        click_tracking: {
          enable: false,
          enable_text: false
        },
        open_tracking: {
          enable: false
        }
      }
    };
    
    // Use our enhanced sendEmail method with detailed diagnostics
    const result = await this.sendEmail({
      to: email,
      subject,
      text,
      html,
      sendgridOptions
    });
    
    if (result.success) {
      console.log(`✅ Verification email sent successfully to ${email} via ${result.method}`);
      console.log(`- Message ID: ${result.messageId || 'unknown'}`);
    } else {
      console.error(`❌ Failed to send verification email to ${email}`);
      if (result.error) {
        console.error(`- Error: ${result.error.message}`);
        if (result.error.code) {
          console.error(`- Error code: ${result.error.code}`);
        }
      }
      
      if (result.smtpDiagnostics && result.smtpDiagnostics.attempted) {
        console.error(`- SMTP attempt failed: ${result.smtpDiagnostics.error || 'Unknown error'}`);
      }
      
      if (result.sendgridDiagnostics && result.sendgridDiagnostics.attempted) {
        console.error(`- SendGrid attempt failed: ${result.sendgridDiagnostics.error || 'Unknown error'}`);
        if (result.sendgridDiagnostics.statusCode) {
          console.error(`- SendGrid status code: ${result.sendgridDiagnostics.statusCode}`);
        }
      }
      
      // Log troubleshooting suggestions
      console.error('📋 EMAIL TROUBLESHOOTING:');
      console.error('- Check that the FROM_EMAIL is properly formatted and contains both username and domain');
      console.error('- Verify that the SMTP credentials are correct');
      console.error('- Ensure the SendGrid API key has the necessary permissions');
      console.error('- Check if the sender domain is properly authenticated in SendGrid');
    }
    
    // Return the full result object for enhanced diagnostics
    return result;
  }
}

export const emailService = new EmailService();