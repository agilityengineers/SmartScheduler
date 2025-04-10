/**
 * Email Template Manager Service
 * 
 * This service provides functionality to retrieve, update and manage email templates
 * stored in the system.
 */

import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Define the template types
export type EmailTemplateType = 
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'event-reminder'
  | 'booking-host'
  | 'booking-guest';

// Template model
export interface EmailTemplate {
  id: EmailTemplateType;
  name: string;
  description: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  variables: string[];
  lastUpdated?: Date;
}

// Default templates - these will be used if custom templates don't exist
const defaultTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to users after they complete registration',
    subject: 'Welcome to My Smart Scheduler',
    textContent: `
Hello {user_name},

Welcome to My Smart Scheduler! 

Your account has been successfully created. You can now start using our platform to manage your schedule and bookings.

Here's what you can do:
- Create calendar events
- Set up booking links for others to schedule time with you
- Integrate with your existing calendars
- Manage your team's schedule

If you have any questions or need assistance, please contact our support team.

Thanks,
The My Smart Scheduler Team
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to My Smart Scheduler</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Welcome!</h2>
      <p>Hello {user_name},</p>
      <p>Welcome to My Smart Scheduler! Your account has been successfully created.</p>
      <p>You can now start using our platform to manage your schedule and bookings.</p>
      
      <h3>Here's what you can do:</h3>
      <ul>
        <li>Create calendar events</li>
        <li>Set up booking links for others to schedule time with you</li>
        <li>Integrate with your existing calendars</li>
        <li>Manage your team's schedule</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="{dashboard_link}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Go to Dashboard</a>
      </div>
      
      <p>If you have any questions or need assistance, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is a transactional email sent from an automated system. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{user_name}', '{dashboard_link}']
  },
  {
    id: 'verification',
    name: 'Email Verification',
    description: 'Sent to verify user email address during registration',
    subject: 'Verify Your Email - My Smart Scheduler',
    textContent: `
Hello,

Thank you for registering with My Smart Scheduler!

To verify your email address and activate your account, please click on the link below or copy it into your browser:
{verify_link}

This link will expire in 24 hours.

If you didn't create an account with us, you can safely ignore this email.

Thanks,
The My Smart Scheduler Team
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Verify Your Email</h2>
      <p>Hello,</p>
      <p>Thank you for registering with My Smart Scheduler!</p>
      <p>Please click the button below to verify your email address and activate your account. This link will expire in 24 hours.</p>
      <div style="text-align: center;">
        <a href="{verify_link}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Verify My Email</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="{verify_link}">{verify_link}</a></p>
      <p>If you didn't create an account with us, you can safely ignore this email.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>Why am I receiving this email?</strong></p>
        <p>You are receiving this email because someone registered for My Smart Scheduler using this email address. If this wasn't you, you can safely ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is a transactional email sent from an automated system. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{verify_link}']
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset',
    subject: 'Reset Your Password - My Smart Scheduler',
    textContent: `
Hello,

You've requested to reset your password for your My Smart Scheduler account.

To reset your password, please click on the link below or copy it into your browser:
{reset_link}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Thanks,
The My Smart Scheduler Team
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>You've requested to reset your password for your My Smart Scheduler account.</p>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <div style="text-align: center;">
        <a href="{reset_link}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Reset My Password</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="{reset_link}">{reset_link}</a></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>Why am I receiving this email?</strong></p>
        <p>You are receiving this email because a password reset was requested for your My Smart Scheduler account. If you didn't make this request, you can safely ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is a transactional email sent from an automated system. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{reset_link}']
  },
  {
    id: 'event-reminder',
    name: 'Event Reminder',
    description: 'Sent to remind users of upcoming events',
    subject: 'Reminder: {event_title} - starting soon',
    textContent: `
Reminder: Your event "{event_title}" is starting soon.

Event Details:
- Start Time: {event_start_time}
- Location: {event_location}
- Description: {event_description}

This is an automated reminder from My Smart Scheduler.
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .event-details {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Event Reminder</h2>
      <p>Your event <strong>{event_title}</strong> is starting soon.</p>
      
      <div class="event-details">
        <h3>Event Details</h3>
        <p><strong>Start Time:</strong> {event_start_time}</p>
        <p><strong>Location:</strong> {event_location}</p>
        <p><strong>Description:</strong> {event_description}</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is an automated reminder from My Smart Scheduler.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{event_title}', '{event_start_time}', '{event_location}', '{event_description}']
  },
  {
    id: 'booking-host',
    name: 'Booking Confirmation (Host)',
    description: 'Sent to the host when a booking is confirmed',
    subject: 'New Booking: {event_title}',
    textContent: `
A new booking has been made for "{event_title}".

Booking Details:
- Start: {event_start_time}
- End: {event_end_time}
- Guest: {guest_email}
- Location: {event_location}
- Notes: {event_description}

This booking has been added to your calendar.
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .booking-details {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>New Booking Confirmation</h2>
      <p>A new booking has been made for <strong>{event_title}</strong>.</p>
      
      <div class="booking-details">
        <h3>Booking Details</h3>
        <p><strong>Start:</strong> {event_start_time}</p>
        <p><strong>End:</strong> {event_end_time}</p>
        <p><strong>Guest:</strong> {guest_email}</p>
        <p><strong>Location:</strong> {event_location}</p>
        <p><strong>Notes:</strong> {event_description}</p>
      </div>
      
      <p>This booking has been added to your calendar.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is an automated message from My Smart Scheduler.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{event_title}', '{event_start_time}', '{event_end_time}', '{guest_email}', '{event_location}', '{event_description}']
  },
  {
    id: 'booking-guest',
    name: 'Booking Confirmation (Guest)',
    description: 'Sent to the guest when a booking is confirmed',
    subject: 'Booking Confirmation: {event_title}',
    textContent: `
Your booking for "{event_title}" has been confirmed.

Booking Details:
- Start: {event_start_time}
- End: {event_end_time}
- Host: {host_email}
- Location: {event_location}
- Notes: {event_description}

This booking has been added to your calendar.
`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .booking-details {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Booking Confirmation</h2>
      <p>Your booking for <strong>{event_title}</strong> has been confirmed.</p>
      
      <div class="booking-details">
        <h3>Booking Details</h3>
        <p><strong>Start:</strong> {event_start_time}</p>
        <p><strong>End:</strong> {event_end_time}</p>
        <p><strong>Host:</strong> {host_email}</p>
        <p><strong>Location:</strong> {event_location}</p>
        <p><strong>Notes:</strong> {event_description}</p>
      </div>
      
      <p>This booking has been added to your calendar.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
      <p>This is an automated message from My Smart Scheduler.</p>
    </div>
  </div>
</body>
</html>
`,
    variables: ['{event_title}', '{event_start_time}', '{event_end_time}', '{host_email}', '{event_location}', '{event_description}']
  }
];

/**
 * Templates directory for storing custom templates
 */
const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'email-templates');
export const TEMPLATE_FILENAME = 'templates.json';

/**
 * Email Template Manager class
 */
export class EmailTemplateManager {
  private templates: Map<EmailTemplateType, EmailTemplate>;
  
  constructor() {
    this.templates = new Map();
    this.ensureTemplateDir();
    this.loadTemplates();
  }
  
  /**
   * Make sure the templates directory exists
   */
  private async ensureTemplateDir() {
    try {
      await fsPromises.mkdir(TEMPLATES_DIR, { recursive: true });
      console.log(`✅ Templates directory exists or was created at ${TEMPLATES_DIR}`);
    } catch (error) {
      console.error('❌ Failed to create templates directory:', error);
    }
  }
  
  /**
   * Load templates from file or use defaults
   */
  private async loadTemplates() {
    try {
      // Ensure directory exists
      await this.ensureTemplateDir();
      
      const templatePath = path.join(TEMPLATES_DIR, TEMPLATE_FILENAME);
      
      // Check if templates file exists
      let templateFileExists = false;
      try {
        await fsPromises.access(templatePath);
        templateFileExists = true;
      } catch {
        templateFileExists = false;
      }
      
      if (templateFileExists) {
        // Load templates from file
        const data = await fsPromises.readFile(templatePath, 'utf8');
        const loadedTemplates = JSON.parse(data) as EmailTemplate[];
        
        // Initialize templates map with loaded templates
        loadedTemplates.forEach(template => {
          this.templates.set(template.id as EmailTemplateType, template);
        });
        
        console.log(`✅ Loaded ${loadedTemplates.length} custom email templates from ${templatePath}`);
      } else {
        // Initialize templates map with default templates
        defaultTemplates.forEach(template => {
          this.templates.set(template.id, template);
        });
        
        // Save default templates to file
        await this.saveTemplates();
        console.log(`✅ Initialized default email templates to ${templatePath}`);
      }
    } catch (error) {
      console.error('❌ Failed to load email templates:', error);
      // Fall back to default templates if loading fails
      defaultTemplates.forEach(template => {
        this.templates.set(template.id, template);
      });
    }
  }
  
  /**
   * Save templates to file
   */
  private async saveTemplates() {
    try {
      // Ensure directory exists
      await this.ensureTemplateDir();
      
      const templatePath = path.join(TEMPLATES_DIR, TEMPLATE_FILENAME);
      const templatesArray = Array.from(this.templates.values());
      
      // Add last updated timestamp
      templatesArray.forEach(template => {
        template.lastUpdated = new Date();
      });
      
      await fsPromises.writeFile(
        templatePath, 
        JSON.stringify(templatesArray, null, 2),
        'utf8'
      );
      
      console.log(`✅ Saved ${templatesArray.length} templates to ${templatePath}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save email templates:', error);
      return false;
    }
  }
  
  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values());
  }
  
  /**
   * Get a specific template by ID
   */
  async getTemplate(id: EmailTemplateType): Promise<EmailTemplate | undefined> {
    return this.templates.get(id);
  }
  
  /**
   * Update a template
   */
  async updateTemplate(id: EmailTemplateType, template: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    const existing = this.templates.get(id);
    
    if (!existing) {
      return null;
    }
    
    // Update fields
    const updated: EmailTemplate = {
      ...existing,
      ...template,
      id, // Ensure ID doesn't change
      lastUpdated: new Date()
    };
    
    // Save to map
    this.templates.set(id, updated);
    
    // Save to file
    await this.saveTemplates();
    
    return updated;
  }
  
  /**
   * Reset a template to its default
   */
  async resetTemplate(id: EmailTemplateType): Promise<EmailTemplate | null> {
    const defaultTemplate = defaultTemplates.find(t => t.id === id);
    
    if (!defaultTemplate) {
      return null;
    }
    
    // Update with default values
    this.templates.set(id, {
      ...defaultTemplate,
      lastUpdated: new Date()
    });
    
    // Save to file
    await this.saveTemplates();
    
    return this.templates.get(id) || null;
  }
  
  /**
   * Reset all templates to defaults
   */
  async resetAllTemplates(): Promise<boolean> {
    // Reset to defaults
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, {
        ...template,
        lastUpdated: new Date()
      });
    });
    
    // Save to file
    return this.saveTemplates();
  }
}

// Create a singleton instance
export const emailTemplateManager = new EmailTemplateManager();