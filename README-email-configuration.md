# Email Configuration Guide for SmartScheduler

## Overview

This document provides a comprehensive guide for configuring and troubleshooting the email system in SmartScheduler. The platform now uses an SMTP-only email delivery approach for maximum reliability in production environments.

## Required Environment Variables

To enable email functionality, you must configure the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `FROM_EMAIL` | Email address used as the sender | `noreply@mysmartscheduler.co` |
| `SMTP_HOST` | SMTP server hostname | `server.pushbutton-hosting.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | SMTP account username | `app@mysmartscheduler.co` |
| `SMTP_PASS` | SMTP account password | (your password) |
| `SMTP_SECURE` | Use SSL/TLS (true/false) | `true` |

## Configuration Methods

### 1. Environment Variables (Recommended for Production)

Set the environment variables on your hosting platform. For Replit:

1. Go to the "Secrets" tab in your Repl
2. Add each of the variables listed above
3. Click "Apply" or restart your Repl for changes to take effect

### 2. Configuration File (Alternative)

Create a `smtp-config.json` file in your project root with the following structure:

```json
{
  "FROM_EMAIL": "noreply@mysmartscheduler.co",
  "SMTP_HOST": "server.pushbutton-hosting.com",
  "SMTP_PORT": "465",
  "SMTP_USER": "app@mysmartscheduler.co",
  "SMTP_PASS": "your-actual-password",
  "SMTP_SECURE": "true"
}
```

## Troubleshooting

### Diagnostic Tools

The system includes several diagnostic tools to help troubleshoot email issues:

1. **Quick SMTP Configuration Check**:
   ```bash
   node server/scripts/diagnoseSmtpConfig.js
   ```
   This provides a complete overview of your SMTP configuration and identifies common problems.

2. **Email Verification Test**:
   ```bash
   node server/scripts/testVerificationEmail.js your-email@example.com
   ```
   This sends a test verification email to the specified address.

3. **Basic SMTP Connectivity Test**:
   ```bash
   node server/scripts/testSmtp.js
   ```
   This checks if your SMTP server is reachable and your credentials are valid.

### Common Issues and Solutions

1. **"SMTP not configured" error**:
   - Check that all required environment variables are set
   - Ensure your SMTP password is correct (not a placeholder)
   - Verify that the variables are accessible to the application

2. **Email sends in development but not production**:
   - Production environments often have different network configurations
   - Check firewall settings to ensure outbound SMTP traffic is allowed
   - Verify that your SMTP provider allows connections from your hosting platform

3. **"Authentication failed" errors**:
   - Double-check your SMTP username and password
   - Some providers require app-specific passwords for SMTP access
   - Ensure your SMTP account has sending privileges

4. **Emails not being received**:
   - Check spam/junk folders
   - Verify your domain has proper DNS records (MX, SPF, DMARC)
   - Ensure the FROM_EMAIL domain matches your SMTP provider's requirements

## Current Production Configuration

Our current production SMTP configuration:

- SMTP Server: `server.pushbutton-hosting.com`
- SMTP Port: `465`
- SMTP User: `app@mysmartscheduler.co`
- From Email: `noreply@mysmartscheduler.co`
- Secure: `true` (SSL/TLS)

## Testing in Production

To verify your configuration in the production environment:

1. Run the diagnostic tool to check configuration:
   ```bash
   node server/scripts/diagnoseSmtpConfig.js
   ```

2. Send a test email using the web interface at `/settings/email` 
   (requires login with admin credentials)

## Support

If you continue to experience issues after following this guide, please provide the following information when requesting support:

1. The output from `node server/scripts/diagnoseSmtpConfig.js`
2. Your hosting environment (Replit, etc.)
3. Any error messages displayed in the application
4. The specific email functionality that's failing (verification, reminders, etc.)