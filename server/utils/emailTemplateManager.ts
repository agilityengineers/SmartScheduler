import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Promisify file system operations
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

// Define template types
export enum EmailTemplateType {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  BOOKING_CONFIRMATION = 'booking_confirmation',
  EVENT_REMINDER = 'event_reminder',
  TEAM_INVITATION = 'team_invitation',
  WELCOME = 'welcome'
}

// Interface for template content
export interface EmailTemplate {
  id: EmailTemplateType;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  lastUpdated?: Date;
}

// Directory where templates will be stored
const TEMPLATES_DIR = path.join(process.cwd(), 'server', 'templates');

// Default templates
const DEFAULT_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  [EmailTemplateType.VERIFICATION]: {
    id: EmailTemplateType.VERIFICATION,
    name: 'Email Verification',
    description: 'Sent to users to verify their email address',
    subject: 'Verify Your Email Address',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Smart Scheduler!</h2>
        <p>Hello {{username}},</p>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationLink}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify My Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>{{verificationLink}}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Welcome to Smart Scheduler!
      
      Hello {{username}},
      
      Thank you for signing up. Please verify your email address by visiting the link below:
      
      {{verificationLink}}
      
      This link will expire in 24 hours.
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['username', 'verificationLink']
  },
  [EmailTemplateType.PASSWORD_RESET]: {
    id: EmailTemplateType.PASSWORD_RESET,
    name: 'Password Reset',
    description: 'Sent to users to reset their password',
    subject: 'Reset Your Password',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello {{username}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>{{resetLink}}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Password Reset Request
      
      Hello {{username}},
      
      We received a request to reset your password. Please visit the link below to create a new password:
      
      {{resetLink}}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['username', 'resetLink']
  },
  [EmailTemplateType.BOOKING_CONFIRMATION]: {
    id: EmailTemplateType.BOOKING_CONFIRMATION,
    name: 'Booking Confirmation',
    description: 'Sent to users when a booking is confirmed',
    subject: 'Your Booking Confirmation',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmation</h2>
        <p>Hello {{recipientName}},</p>
        <p>Your booking has been confirmed!</p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Meeting with:</strong> {{hostName}}</p>
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
          <p><strong>Meeting Type:</strong> {{eventType}}</p>
          <p><strong>Location:</strong> {{location}}</p>
        </div>
        <p>You can manage your booking <a href="{{managementLink}}">here</a>.</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Booking Confirmation
      
      Hello {{recipientName}},
      
      Your booking has been confirmed!
      
      Meeting with: {{hostName}}
      Date: {{date}}
      Time: {{startTime}} - {{endTime}}
      Meeting Type: {{eventType}}
      Location: {{location}}
      
      You can manage your booking here: {{managementLink}}
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['recipientName', 'hostName', 'date', 'startTime', 'endTime', 'eventType', 'location', 'managementLink']
  },
  [EmailTemplateType.EVENT_REMINDER]: {
    id: EmailTemplateType.EVENT_REMINDER,
    name: 'Event Reminder',
    description: 'Sent to remind users of upcoming events',
    subject: 'Reminder: Upcoming Event',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Reminder</h2>
        <p>Hello {{recipientName}},</p>
        <p>This is a reminder about your upcoming event:</p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Event:</strong> {{eventTitle}}</p>
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Notes:</strong> {{notes}}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Event Reminder
      
      Hello {{recipientName}},
      
      This is a reminder about your upcoming event:
      
      Event: {{eventTitle}}
      Date: {{date}}
      Time: {{startTime}} - {{endTime}}
      Location: {{location}}
      Notes: {{notes}}
      
      We look forward to seeing you!
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['recipientName', 'eventTitle', 'date', 'startTime', 'endTime', 'location', 'notes']
  },
  [EmailTemplateType.TEAM_INVITATION]: {
    id: EmailTemplateType.TEAM_INVITATION,
    name: 'Team Invitation',
    description: 'Sent to invite users to join a team',
    subject: 'Invitation to Join Team',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invitation</h2>
        <p>Hello,</p>
        <p>You've been invited to join the team "{{teamName}}" by {{inviterName}}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitationLink}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Accept Invitation</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>{{invitationLink}}</p>
        <p>This invitation will expire in 7 days.</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Team Invitation
      
      Hello,
      
      You've been invited to join the team "{{teamName}}" by {{inviterName}}.
      
      To accept the invitation, please visit:
      
      {{invitationLink}}
      
      This invitation will expire in 7 days.
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['teamName', 'inviterName', 'invitationLink']
  },
  [EmailTemplateType.WELCOME]: {
    id: EmailTemplateType.WELCOME,
    name: 'Welcome Email',
    description: 'Sent to new users after email verification',
    subject: 'Welcome to Smart Scheduler!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Smart Scheduler!</h2>
        <p>Hello {{username}},</p>
        <p>Thank you for verifying your email address. Your account is now fully activated.</p>
        <p>Here are some tips to get started:</p>
        <ul>
          <li>Set up your availability preferences</li>
          <li>Create your first booking link</li>
          <li>Connect your calendar</li>
          <li>Customize your booking page</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardLink}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
        <p>Best regards,<br>Smart Scheduler Team</p>
      </div>
    `,
    textContent: `
      Welcome to Smart Scheduler!
      
      Hello {{username}},
      
      Thank you for verifying your email address. Your account is now fully activated.
      
      Here are some tips to get started:
      - Set up your availability preferences
      - Create your first booking link
      - Connect your calendar
      - Customize your booking page
      
      To access your dashboard, visit: {{dashboardLink}}
      
      If you have any questions, please don't hesitate to reach out to our support team.
      
      Best regards,
      Smart Scheduler Team
    `,
    variables: ['username', 'dashboardLink']
  }
};

/**
 * Ensures the templates directory exists
 */
async function ensureTemplatesDirectory(): Promise<void> {
  try {
    await access(TEMPLATES_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await mkdir(TEMPLATES_DIR, { recursive: true });
  }
}

/**
 * Gets the path to a specific template file
 */
function getTemplatePath(templateId: EmailTemplateType): string {
  return path.join(TEMPLATES_DIR, `${templateId}.json`);
}

/**
 * Initializes the templates directory with default templates if not already present
 */
export async function initializeTemplates(): Promise<void> {
  try {
    await ensureTemplatesDirectory();

    // Check each template type and create default if not exists
    for (const templateType of Object.values(EmailTemplateType)) {
      const templatePath = getTemplatePath(templateType);
      try {
        await access(templatePath);
        // Template exists, continue to next
      } catch (error) {
        // Template doesn't exist, create default
        const defaultTemplate = DEFAULT_TEMPLATES[templateType];
        await saveTemplate(defaultTemplate);
      }
    }
    
    console.log('Email templates initialized successfully');
  } catch (error) {
    console.error('Error initializing email templates:', error);
    throw error;
  }
}

/**
 * Gets all available email templates
 */
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  try {
    await ensureTemplatesDirectory();
    
    const templates: EmailTemplate[] = [];
    
    for (const templateType of Object.values(EmailTemplateType)) {
      try {
        const template = await getTemplate(templateType);
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        console.error(`Error loading template ${templateType}:`, error);
        // Use default template as fallback
        templates.push(DEFAULT_TEMPLATES[templateType]);
      }
    }
    
    return templates;
  } catch (error) {
    console.error('Error loading all templates:', error);
    // If failed to load, return defaults
    return Object.values(DEFAULT_TEMPLATES);
  }
}

/**
 * Gets a specific email template
 */
export async function getTemplate(templateId: EmailTemplateType): Promise<EmailTemplate> {
  try {
    const templatePath = getTemplatePath(templateId);
    
    try {
      await access(templatePath);
      // Template exists, read it
      const templateData = await readFile(templatePath, 'utf8');
      return JSON.parse(templateData);
    } catch (error) {
      // Template doesn't exist, return default
      console.log(`Template ${templateId} not found, using default`);
      return DEFAULT_TEMPLATES[templateId];
    }
  } catch (error) {
    console.error(`Error getting template ${templateId}:`, error);
    throw error;
  }
}

/**
 * Saves an email template
 */
export async function saveTemplate(template: EmailTemplate): Promise<EmailTemplate> {
  try {
    await ensureTemplatesDirectory();
    
    const templatePath = getTemplatePath(template.id);
    
    // Add last updated timestamp
    const updatedTemplate = {
      ...template,
      lastUpdated: new Date()
    };
    
    await writeFile(templatePath, JSON.stringify(updatedTemplate, null, 2), 'utf8');
    return updatedTemplate;
  } catch (error) {
    console.error(`Error saving template ${template.id}:`, error);
    throw error;
  }
}

/**
 * Resets a template to its default
 */
export async function resetTemplate(templateId: EmailTemplateType): Promise<EmailTemplate> {
  try {
    const defaultTemplate = DEFAULT_TEMPLATES[templateId];
    return await saveTemplate(defaultTemplate);
  } catch (error) {
    console.error(`Error resetting template ${templateId}:`, error);
    throw error;
  }
}

/**
 * Tests a template by replacing variables and returning the result
 */
export function testTemplate(template: EmailTemplate, variables: Record<string, string>): { html: string; text: string } {
  let html = template.htmlContent;
  let text = template.textContent;
  
  // Replace variables
  for (const key of Object.keys(variables)) {
    const value = variables[key];
    const pattern = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(pattern, value);
    text = text.replace(pattern, value);
  }
  
  return { html, text };
}

/**
 * Updates a specific email template with new content
 */
export async function updateTemplate(
  templateId: EmailTemplateType, 
  updates: { subject?: string; htmlContent?: string; textContent?: string }
): Promise<EmailTemplate> {
  try {
    // Get the existing template
    const template = await getTemplate(templateId);
    
    // Apply updates
    const updatedTemplate: EmailTemplate = {
      ...template,
      subject: updates.subject ?? template.subject,
      htmlContent: updates.htmlContent ?? template.htmlContent,
      textContent: updates.textContent ?? template.textContent
    };
    
    // Save the updated template
    return await saveTemplate(updatedTemplate);
  } catch (error) {
    console.error(`Error updating template ${templateId}:`, error);
    throw error;
  }
}

/**
 * Resets all templates to their defaults
 */
export async function resetAllTemplates(): Promise<boolean> {
  try {
    await ensureTemplatesDirectory();
    
    // Reset each template type
    for (const templateType of Object.values(EmailTemplateType)) {
      await resetTemplate(templateType);
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting all templates:', error);
    return false;
  }
}

export default {
  initializeTemplates,
  getAllTemplates,
  getTemplate,
  saveTemplate,
  resetTemplate,
  updateTemplate,
  resetAllTemplates,
  testTemplate,
  EmailTemplateType
};