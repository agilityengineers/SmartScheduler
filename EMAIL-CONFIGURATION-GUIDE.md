# Email Configuration Guide

## Overview
This document provides comprehensive instructions for configuring, testing, and maintaining the email system in both development and production environments. The SmartScheduler application uses email for critical functions including user registration verification, booking confirmations, and team notifications.

## Configuration

### Required Environment Variables
The email system requires the following environment variables:

```
FROM_EMAIL=noreply@mysmartscheduler.co
SMTP_HOST=server.pushbutton-hosting.com
SMTP_PORT=465
SMTP_USER=noreply@mysmartscheduler.co
SMTP_SECURE=true
SMTP_PASS=Success2025
```

### Development Environment Setup
1. Create or edit a `.env` file in your local development directory
2. Add all the required environment variables listed above
3. Restart your development server

### Production Environment Setup
For detailed production setup instructions, please refer to [PRODUCTION-EMAIL-SETUP.md](PRODUCTION-EMAIL-SETUP.md).

## Testing Email Configuration

### Basic Tests
Use these commands to test your email configuration:

**Test Environment Variables:**
```bash
node server/scripts/testProductionEnvironment.js
```

**Test Email Sending (Ethereal.Email):**
```bash
node test-email.js
```

**Test Email Sending (Real Address):**
```bash
node test-real-email.js your@email.com
```

**Test Registration Email Flow:**
```bash
node server/scripts/testProductionRegistration.js your@email.com
```

### Comprehensive Diagnostics
For a complete email system diagnostic test:

```bash
node server/scripts/productionEmailDiagnostic.js your@email.com
```

This will test:
- Environment variable configuration
- DNS resolution
- Network connectivity
- TLS/SSL connection
- SMTP authentication
- Email sending

## Troubleshooting Common Issues

### Authentication Failures
- Verify that `SMTP_USER` and `SMTP_PASS` are correct
- Ensure no extra spaces or characters in the password
- The correct password starts with "S" and ends with "5"

### Connection Issues
- Check for firewalls blocking outgoing email (port 465)
- Verify network connectivity to the SMTP server
- Try a different port if your provider supports alternatives

### Email Not Arriving
- Check spam/junk folders
- Verify the recipient email domain exists and accepts mail
- Test with multiple email services (Gmail, Outlook, etc.)

## Supported Email Functions

The email system handles the following types of emails:

1. **Verification Emails**: Sent after registration to verify user email addresses
2. **Password Reset Emails**: Sent when users request password resets
3. **Booking Confirmation Emails**: Sent after booking appointments
4. **Reminder Emails**: Sent before scheduled appointments
5. **Team Notification Emails**: Sent for team-related activities

## Email Templates

Email templates are stored in `server/utils/emailTemplates.ts`. Each template has:
- HTML version with styling
- Plain text fallback version
- Dynamic content insertion

## Monitoring and Logs

- Email sending attempts are logged to the console
- When running diagnostics, logs are written to `production-email-diagnostics.log`
- Use the logging to identify issues with specific email deliveries

## Security Considerations

- SMTP passwords should never be committed to version control
- Use environment variables or secure secrets management
- TLS is enabled by default for secure email transmission
- Implement rate limiting to prevent abuse

---

Document Created: April 2025