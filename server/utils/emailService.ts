import sgMail from '@sendgrid/mail';
import { Event } from '../../shared/schema';
import { timeZoneService } from './timeZoneService';
import { getPasswordResetHtml, getPasswordResetText, getEmailVerificationHtml, getEmailVerificationText } from './emailTemplates';

// Initialize SendGrid with API key
const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
sgMail.setApiKey(sendgridApiKey);

// Log API key status - more detailed for debugging
if (!sendgridApiKey) {
  console.error('SENDGRID_API_KEY is not set. Email functionality will not work correctly.');
} else {
  console.log('SendGrid API key is configured:', sendgridApiKey.substring(0, 5) + '...' + sendgridApiKey.substring(sendgridApiKey.length - 5));
  console.log('SendGrid API key length:', sendgridApiKey.length);
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private readonly FROM_EMAIL = 'noreply@mysmartscheduler.co'; // Make sure this is a verified sender in SendGrid
  
  /**
   * Sends an email using SendGrid
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to success status
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY is not set. Cannot send email.');
        return false;
      }
      
      const msg = {
        to: options.to,
        from: this.FROM_EMAIL,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };
      
      console.log(`Attempting to send email to ${options.to} with subject "${options.subject}"`);
      
      const [response] = await sgMail.send(msg);
      console.log(`Email sent successfully to ${options.to}. Status code: ${response.statusCode}`);
      return true;
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Log more detailed error information if available
      if (error.response) {
        console.error('SendGrid API error response:', {
          status: error.response.status,
          body: error.response.body,
          headers: error.response.headers
        });
      }
      
      return false;
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
    
    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
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
    const hostEmailSent = await this.sendEmail({
      to: hostEmail,
      subject: hostSubject,
      text: hostText,
      html: hostHtml
    });
    
    const guestEmailSent = await this.sendEmail({
      to: guestEmail,
      subject: guestSubject,
      text: guestText,
      html: guestHtml
    });
    
    return hostEmailSent && guestEmailSent;
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
    
    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }
  
  /**
   * Sends an email verification email
   * @param email The recipient email address
   * @param verifyLink The email verification link
   * @returns Promise resolving to success status
   */
  async sendEmailVerificationEmail(email: string, verifyLink: string): Promise<boolean> {
    const subject = 'Verify Your Email - My Smart Scheduler';
    
    const text = getEmailVerificationText(verifyLink);
    const html = getEmailVerificationHtml(verifyLink);
    
    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();