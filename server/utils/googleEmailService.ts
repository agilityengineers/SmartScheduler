/**
 * Google Enterprise Email Service
 * 
 * This module provides functionality for sending emails using Google's SMTP servers
 * with a Google Workspace / Google Enterprise account.
 */

import nodemailer from 'nodemailer';
import { EmailSendResult, EmailOptions } from './emailService';

export interface GoogleEmailConfig {
  email: string;        // Your Google Workspace email (e.g., noreply@yourdomain.com)
  password: string;     // App password or account password
  name?: string;        // Optional display name for the sender
}

export class GoogleEmailService {
  private transport: nodemailer.Transporter | null = null;
  private readonly config: GoogleEmailConfig;
  
  constructor(config: GoogleEmailConfig) {
    this.config = config;
    
    // Log configuration status (without exposing the password)
    console.log('🔄 Google Email Service initializing...');
    console.log(`- Email: ${this.config.email}`);
    console.log(`- Display Name: ${this.config.name || 'Not set'}`);
    console.log(`- Password: ${this.config.password ? '[Set]' : '[Not set]'}`);
  }
  
  /**
   * Initializes the Nodemailer transport for Gmail
   */
  private initTransport(): nodemailer.Transporter {
    if (this.transport) {
      return this.transport;
    }
    
    // Create the Gmail transport
    console.log('🔄 Creating Google Email transport...');
    
    this.transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: this.config.email,
        pass: this.config.password
      },
      // Production-ready settings
      pool: true, // Use pooled connections
      maxConnections: 5, // Maximum number of connections
      maxMessages: 100, // Maximum number of messages per connection
      // Set timeouts
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 30000, // 30 seconds
      // TLS options
      tls: {
        // Don't fail on invalid certs
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
    
    return this.transport;
  }
  
  /**
   * Verifies the connection to Google's SMTP server
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transport = this.initTransport();
      await transport.verify();
      console.log('✅ Google Email SMTP connection verified successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Google Email SMTP connection failed:', error.message);
      
      // More detailed error information for common issues
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. This could be due to:');
        console.error('- Incorrect password');
        console.error('- Google account has 2FA enabled, requiring an app password');
        console.error('- Less secure app access is disabled (for regular Gmail accounts)');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection failed. This could be due to:');
        console.error('- Network connectivity issues');
        console.error('- Firewall or proxy blocking the connection');
      }
      
      return false;
    }
  }
  
  /**
   * Sends an email using Google's SMTP server
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.log(`📧 Preparing to send email via Google to ${options.to} with subject "${options.subject}"`);
    
    // Create a result object
    const result: EmailSendResult = {
      success: false,
      smtpDiagnostics: {
        configured: !!this.config.email && !!this.config.password,
        attempted: false,
        host: 'smtp.gmail.com',
        port: 465,
        user: this.config.email,
        secure: true
      }
    };
    
    // Check if configured
    if (!this.config.email || !this.config.password) {
      console.error('❌ Google Email not configured (missing email or password)');
      result.error = {
        message: 'Google Email configuration missing',
        code: 'CONFIG_MISSING'
      };
      return result;
    }
    
    try {
      // Mark as attempted
      if (result.smtpDiagnostics) {
        result.smtpDiagnostics.attempted = true;
      }
      
      // Get transport
      const transport = this.initTransport();
      
      // Create from address with optional display name
      const from = this.config.name 
        ? `"${this.config.name}" <${this.config.email}>`
        : this.config.email;
      
      // Send the email
      const info = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      
      // Log success
      console.log(`✅ Google Email delivery successful to ${options.to}`);
      console.log(`- Message ID: ${info.messageId}`);
      
      // Update result
      result.success = true;
      result.messageId = info.messageId;
      result.method = 'smtp';
      
      return result;
    } catch (error: any) {
      // Log error
      console.error('❌ Google Email delivery failed:', error.message);
      
      // Update result with error details
      result.error = {
        message: error.message,
        code: error.code,
        details: error.response || error.stack
      };
      
      return result;
    }
  }
}