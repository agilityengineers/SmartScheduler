# Email Configuration Guide for My Smart Scheduler

This guide explains how to configure email settings for My Smart Scheduler to ensure proper delivery of verification emails, password reset emails, and notification emails.

## Configuration Options

Email can be configured in two ways:

1. **Environment Variables** (Recommended for Production)
2. **Configuration File** (Development & Testing only)

### Required Configuration

For email to work properly, the following settings must be configured:

| Setting | Description | Example |
|---------|-------------|---------|
| `FROM_EMAIL` | The sender email address (must include both username and domain parts) | `noreply@mysmartscheduler.co` |
| `SMTP_HOST` | SMTP server hostname | `server.pushbutton-hosting.com` |
| `SMTP_PORT` | SMTP server port (usually 465 for SSL, 587 for TLS, or 25) | `465` |
| `SMTP_USER` | SMTP username/account | `app@mysmartscheduler.co` |
| `SMTP_PASS` | SMTP password | `your-actual-password` |
| `SMTP_SECURE` | Whether to use secure connection (SSL/TLS) | `true` |

## Environment Variables Setup

In production, always use environment variables or secrets for security:

```bash
# Production SMTP configuration example
FROM_EMAIL=noreply@mysmartscheduler.co
SMTP_HOST=server.pushbutton-hosting.com
SMTP_PORT=465
SMTP_USER=app@mysmartscheduler.co
SMTP_PASS=your-actual-password
SMTP_SECURE=true
```

## Configuration File Setup

For development, create a `smtp-config.json` file in the project root:

```json
{
  "FROM_EMAIL": "noreply@mysmartscheduler.co",
  "SMTP_HOST": "server.pushbutton-hosting.com",
  "SMTP_PORT": "465",
  "SMTP_USER": "app@mysmartscheduler.co",
  "SMTP_PASS": "your-actual-password",
  "SMTP_SECURE": "true",
  "comment": "IMPORTANT: In production, use environment variables or secrets instead of this file!"
}
```

## Troubleshooting Email Delivery

### Common Issues

1. **Missing Username in FROM_EMAIL**
   - Error: `<@domain.com>: no local part`
   - Solution: Ensure FROM_EMAIL includes both username and domain (e.g., `noreply@mysmartscheduler.co`, not just `@mysmartscheduler.co`)

2. **Placeholder Passwords**
   - Error: Authentication failure
   - Solution: Replace placeholders like `YOUR_ACTUAL_PASSWORD_SHOULD_BE_HERE` with the real password

3. **TLS/SSL Issues**
   - Error: Unable to establish secure connection
   - Solution: Verify SMTP_PORT and SMTP_SECURE settings match your provider's requirements

4. **Configuration File Not Found**
   - Error: SMTP configuration incomplete
   - Solution: Check file exists in project root or `/server` directory

### Diagnostic Tools

My Smart Scheduler includes several diagnostic tools to help verify email configuration:

#### 1. Check SMTP Configuration
```bash
node server/scripts/smtpConfigCheck.js
```

#### 2. Test Basic Email Delivery
```bash
node server/scripts/testEmail.js recipient@example.com
```

#### 3. Test Verification Email Delivery
```bash
node server/scripts/testEmailVerification.js recipient@example.com
```

## Production Configuration

In production, ensure:

1. The SMTP credentials are properly set as environment variables
2. The FROM_EMAIL includes both username and domain parts
3. Any placeholder passwords are replaced with actual passwords
4. The SMTP server allows outbound connections from your hosting provider
5. Your sending domain has proper DNS records (SPF, DKIM, DMARC) to improve deliverability

## Security Considerations

- Never commit SMTP credentials to version control
- Use environment variables or secrets management in production
- In development, keep the `smtp-config.json` file in .gitignore
- Consider using environment-specific settings for different deployment environments

## Support

If you encounter issues with email delivery, please:

1. Run the diagnostic tools mentioned above
2. Check server logs for specific error messages
3. Verify that your SMTP provider allows the type of emails you're sending
4. Contact our support team with the diagnostic results if issues persist