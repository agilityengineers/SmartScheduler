# Production Email Setup for My Smart Scheduler

## Overview

This document provides instructions for setting up email functionality in a production environment. The email system is used for:

- Email verification during user registration
- Password reset emails
- Event reminders
- Booking confirmations

## Production Environment Setup

### Required Environment Variables

For production deployment, you must set the following environment variables:

| Environment Variable | Description                                   | Example                       |
|----------------------|-----------------------------------------------|-------------------------------|
| `FROM_EMAIL`         | Sender email address (must include username part) | `noreply@mysmartscheduler.co` |
| `SMTP_HOST`          | SMTP server hostname                          | `server.pushbutton-hosting.com` |
| `SMTP_PORT`          | SMTP server port                              | `465`                         |
| `SMTP_USER`          | SMTP username for authentication              | `app@mysmartscheduler.co`     |
| `SMTP_PASS`          | SMTP password for authentication              | `your-actual-password`        |
| `SMTP_SECURE`        | Whether to use SSL/TLS (true/false)           | `true`                        |

### Setup Process

1. Run the setup assistant:
   ```bash
   node server/scripts/setProductionEnvironment.js
   ```

2. Follow the prompts to configure your SMTP settings.

3. The script will generate:
   - A `.env.production` file with your settings
   - An updated `smtp-config.json` file for development

4. Add the generated environment variables to your production environment.

5. **IMPORTANT**: Never use the config file in production as it contains sensitive information.

### Testing Production Email Setup

After deployment, test your email configuration with:

```bash
node server/scripts/productionEmailDiagnostic.js your-email@example.com
```

This tool will:
- Validate your SMTP configuration
- Test DNS resolution
- Test TCP connectivity
- Test SMTP authentication
- Send a test verification email

## Common Issues and Solutions

### "FROM_EMAIL is not configured" or "SMTP Server: Not configured"

**Solution**: Ensure environment variables are properly set in production:
- Check that all required environment variables are set
- Verify that FROM_EMAIL includes both username and domain parts
- Make sure you're not using placeholder passwords

### "no local part" Error (501)

**Solution**: This occurs when FROM_EMAIL is missing the username part:
- Incorrect: `@mysmartscheduler.co`
- Correct: `noreply@mysmartscheduler.co`

### Authentication Failures

**Solution**:
- Verify SMTP_USER and SMTP_PASS are correct
- Check if your SMTP server requires any special settings
- Ensure your server's IP is not blocked by the SMTP provider

### Connection Issues

**Solution**:
- Verify outbound connections on port 465 (or your configured port) are allowed
- Check DNS resolution for your SMTP host
- Verify that your SMTP_HOST is correct

## Diagnostic Tools

My Smart Scheduler includes multiple diagnostic tools to help troubleshoot email issues:

### Basic SMTP Configuration Check
```bash
node server/scripts/smtpConfigCheck.js
```

### Test Basic Email Sending
```bash
node server/scripts/testEmail.js recipient@example.com
```

### Test Verification Email Flow
```bash
node server/scripts/testEmailVerification.js recipient@example.com
```

### Comprehensive Production Diagnostics
```bash
node server/scripts/productionEmailDiagnostic.js recipient@example.com
```

## Email Security Best Practices

1. Use environment variables instead of configuration files
2. Use a dedicated email address for system emails
3. Keep SMTP credentials secure
4. Set up proper SPF, DKIM, and DMARC records for your sending domain
5. Monitor email delivery rates and bounces

## Technical Details

The email system has been designed with several resilience features:

- Automatic normalization of FROM_EMAIL to ensure valid format
- Multiple configuration sources (environment variables, config files)
- Detailed error reporting and diagnostics
- Fallback to Ethereal for development testing
- Production-specific validation and error handling
- Connection pooling for high-volume email sending

## Support

If you encounter persistent email issues in production after following these instructions, please:

1. Run the diagnostic tool and save the output
2. Check server logs for any error messages
3. Contact support with the diagnostic results