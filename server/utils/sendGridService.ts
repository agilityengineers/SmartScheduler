/**
 * SendGrid Email Service
 * 
 * This module provides functionality for sending emails using SendGrid's Web API
 * with proper error handling and logging.
 */

import sgMail from '@sendgrid/mail';
import { EmailSendResult, EmailOptions } from './emailService';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class SendGridService {
  private readonly config: SendGridConfig;
  private initialized = false;
  
  constructor(config: SendGridConfig) {
    this.config = config;
    
    this.initSendGrid();
  }
  
  /**
   * Initializes SendGrid with the API key
   */
  private initSendGrid(): void {
    if (this.initialized) {
      return;
    }
    
    if (!this.config.apiKey) {
      console.error('❌ SendGrid API key is not configured');
      return;
    }
    
    try {
      sgMail.setApiKey(this.config.apiKey);
      this.initialized = true;
      console.log('✅ SendGrid initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize SendGrid:', error.message);
    }
  }
  
  /**
   * Verifies the SendGrid configuration by making a test API call
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.initialized) {
      console.error('❌ SendGrid not initialized - cannot verify connection');
      return false;
    }
    
    try {
      // Use SendGrid's API to validate the key by checking user information
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ SendGrid connection verified successfully');
        return true;
      } else {
        console.error(`❌ SendGrid connection verification failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ SendGrid connection verification failed:', error.message);
      
      // Provide helpful error information
      if (error.message.includes('ENOTFOUND')) {
        console.error('- Network connectivity issue (DNS resolution failed)');
      } else if (error.message.includes('UNAUTHORIZED')) {
        console.error('- Invalid SendGrid API key');
      } else if (error.message.includes('FORBIDDEN')) {
        console.error('- SendGrid API key lacks required permissions');
      }
      
      return false;
    }
  }
  
  /**
   * Sends an email using SendGrid's Web API
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.log(`📧 Preparing to send email via SendGrid to ${options.to} with subject "${options.subject}"`);
    
    // Create a result object
    const result: EmailSendResult = {
      success: false,
      smtpDiagnostics: {
        configured: this.initialized,
        attempted: false,
        host: 'api.sendgrid.com',
        port: 443,
        user: this.config.fromEmail,
        secure: true
      }
    };
    
    // Check if SendGrid is properly initialized
    if (!this.initialized) {
      console.error('❌ SendGrid not initialized (missing API key)');
      result.error = {
        message: 'SendGrid not initialized - API key missing or invalid',
        code: 'SENDGRID_NOT_INITIALIZED'
      };
      return result;
    }
    
    try {
      // Mark as attempted
      if (result.smtpDiagnostics) {
        result.smtpDiagnostics.attempted = true;
      }
      
      // Create from address with optional display name
      // Use provided 'from' in options if available, otherwise use config
      const fromEmail = options.from || this.config.fromEmail;
      const from = this.config.fromName
        ? `${this.config.fromName} <${fromEmail}>`
        : fromEmail;
      
      // Prepare the email message
      const msg = {
        to: options.to,
        from: from,
        subject: options.subject,
        text: options.text,
        html: options.html,
        trackingSettings: {
          clickTracking: {
            enable: false,      // Disable click tracking to prevent URL transformation
            enableText: false   // Also disable in plain text emails
          }
        }
      };
      
      // Send the email using SendGrid
      const [response] = await sgMail.send(msg);
      
      // Log success
      console.log(`✅ SendGrid email delivery successful to ${options.to}`);
      console.log(`- Status Code: ${response.statusCode}`);
      console.log(`- Message ID: ${response.headers['x-message-id'] || 'unknown'}`);
      
      // Update result
      result.success = true;
      result.messageId = response.headers['x-message-id'] as string || undefined;
      result.method = 'smtp'; // SendGrid uses HTTP API but we classify as smtp for compatibility
      
      return result;
    } catch (error: any) {
      // Log error
      console.error('❌ SendGrid email delivery failed:', error.message);
      
      // Handle SendGrid-specific errors
      let errorMessage = error.message;
      let errorCode = error.code || 'SENDGRID_ERROR';
      
      if (error.response && error.response.body) {
        const errorBody = error.response.body;
        if (errorBody.errors && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.map((e: any) => e.message).join(', ');
          errorCode = errorBody.errors[0].field || errorCode;
        }
        
        // Log detailed error information
        console.error('- Status Code:', error.response.statusCode);
        console.error('- Error Details:', JSON.stringify(errorBody, null, 2));
        
        // Provide helpful guidance for common errors
        if (error.response.statusCode === 401) {
          console.error('- Check that your SendGrid API key is valid and has mail.send permissions');
        } else if (error.response.statusCode === 403) {
          console.error('- Your SendGrid account may be suspended or the API key lacks permissions');
        } else if (error.response.statusCode === 413) {
          console.error('- Email content is too large (exceeds SendGrid limits)');
        }
      }
      
      // Update result with error details
      result.error = {
        message: errorMessage,
        code: errorCode,
        details: error.response?.body || error.stack
      };
      
      return result;
    }
  }
}