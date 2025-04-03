# Production Email Configuration Guide

This guide details how to properly set up email functionality for the production environment of Smart Scheduler. Proper configuration is critical for user registration, verification, and password reset features to work correctly.

## Required Environment Variables

The following environment variables must be configured in your production environment:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| FROM_EMAIL | Email address used as the sender | noreply@mysmartscheduler.co |
| SMTP_HOST | SMTP server hostname | server.pushbutton-hosting.com |
| SMTP_PORT | SMTP server port | 465 |
| SMTP_USER | SMTP account username | app@mysmartscheduler.co |
| SMTP_PASS | SMTP account password | [Your secure password] |
| SMTP_SECURE | Whether to use secure connection | true |

## Setting Up in Production

### 1. Setting Environment Variables

Most hosting platforms provide a way to set environment variables securely. The method varies by platform:

- **Replit**: Use the Secrets tab in your Repl to set the environment variables.
- **Heroku**: Use the Settings tab to set Config Vars.
- **Vercel**: Use the Environment Variables section in your project settings.
- **Netlify**: Use the Environment variables section in your site settings.
- **Docker**: Set environment variables in your docker-compose.yml or Docker run command.

### 2. Verification

After setting the environment variables, verify that they are loaded correctly by running the provided diagnostic tools:

```bash
# Production email configuration test
node server/scripts/testProductionEmailConfig.js

# Production email verification test
node server/scripts/testProductionVerification.js
```

## Troubleshooting

### Common Issues

1. **Email Not Being Sent**: 
   - Check that all environment variables are set correctly
   - Verify SMTP credentials are correct
   - Check if the SMTP server requires a different port
   - Ensure FROM_EMAIL is properly formatted

2. **Invalid Login Errors**:
   - Verify SMTP_USER and SMTP_PASS are correct
   - Check if the SMTP server requires full email or just username
   - Some providers require app-specific passwords instead of account passwords

3. **SSL/TLS Errors**:
   - Ensure SMTP_SECURE is set to 'true' if using port 465
   - For port 587, SMTP_SECURE should be 'false'

4. **From Address Errors**:
   - Ensure FROM_EMAIL is properly formatted (user@domain.com)
   - Some providers require the FROM_EMAIL to match the SMTP_USER
   - Check if your provider has domain verification requirements

### Diagnostic Steps

If you encounter issues with email delivery in production, follow these steps:

1. Check the application logs for detailed error messages
2. Verify all environment variables are correctly set
3. Run the diagnostic tools mentioned above
4. Test direct connectivity to the SMTP server from your production environment
5. Temporarily enable verbose logging in the email service (see code comments)

## Email Architecture Overview

The application uses a robust multi-layered approach to email delivery:

1. **Environment Loading**: 
   Multiple strategies for loading email configuration values ensure that the system works across different environments.

2. **Graceful Degradation**:
   The system attempts multiple delivery methods with detailed error reporting.

3. **Diagnostics**:
   Comprehensive diagnostic tools help identify and fix issues quickly.

## Security Considerations

- Never commit SMTP_PASS to the repository
- Use environment variables or secrets management for sensitive information
- Consider using dedicated transactional email services for high-volume sending
- Regularly rotate SMTP passwords

---

With this configuration properly set up, the email verification system will function correctly in your production environment.