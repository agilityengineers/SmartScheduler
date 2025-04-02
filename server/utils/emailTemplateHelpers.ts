/**
 * Email Template Helpers
 * 
 * These helper functions combine the text and HTML templates into ready-to-use
 * email objects with subject, text, and HTML content.
 */

import { 
  getEmailVerificationText, 
  getEmailVerificationHtml,
  getPasswordResetText,
  getPasswordResetHtml
} from './emailTemplates';

/**
 * Returns a complete email template package with subject, text and HTML content
 * for a verification email
 * @param verifyLink The link for verifying the email
 */
export function getVerificationEmailTemplate(verifyLink: string) {
  return {
    subject: 'Verify Your Email - My Smart Scheduler',
    text: getEmailVerificationText(verifyLink),
    html: getEmailVerificationHtml(verifyLink)
  };
}

/**
 * Returns a complete email template package with subject, text and HTML content
 * for a password reset email
 * @param resetLink The link for resetting the password
 */
export function getPasswordResetEmailTemplate(resetLink: string) {
  return {
    subject: 'Reset Your Password - My Smart Scheduler',
    text: getPasswordResetText(resetLink),
    html: getPasswordResetHtml(resetLink)
  };
}