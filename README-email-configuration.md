# Email Configuration Guide

This guide explains how to set up email functionality for My Smart Scheduler in both development and production environments.

## Development Environment

### Option 1: Local SMTP Configuration

1. Create a `smtp-config.json` file in the project root with the following structure:

```json
{
  "FROM_EMAIL": "noreply@mysmartscheduler.co",
  "SMTP_HOST": "server.pushbutton-hosting.com",
  "SMTP_PORT": "465",
  "SMTP_USER": "noreply@mysmartscheduler.co",
  "SMTP_PASS": "your-password-here",
  "SMTP_SECURE": "true"
}
```

2. The application will automatically load this configuration during startup.

3. **IMPORTANT:** Do not commit this file to version control as it contains sensitive information.

### Option 2: Environment Variables

Set the following environment variables:

```
FROM_EMAIL=noreply@mysmartscheduler.co
SMTP_HOST=server.pushbutton-hosting.com
SMTP_PORT=465
SMTP_USER=noreply@mysmartscheduler.co
SMTP_PASS=your-password-here
SMTP_SECURE=true
```

### Option 3: No Configuration (Development Only)

If no SMTP configuration is provided in development, the application will automatically use Ethereal Email for testing. All emails will be captured and can be viewed through the provided preview URL in the console logs.

## Production Environment

For production, you must configure email using environment variables. The **FROM_EMAIL** variable is particularly important and must be formatted correctly.

### Setup Script

For easy production setup, run:

```bash
node server/scripts/setProductionEnvironment.js
```

This will:
1. Guide you through the configuration process
2. Generate a `.env.production` file
3. Provide instructions for adding variables to your production environment

### Test Your Configuration

Run the diagnostic tool to verify your email setup:

```bash
node server/scripts/productionEmailDiagnostic.js your-email@example.com
```

This will test DNS resolution, TCP connectivity, SMTP authentication, and send a test email.

## Troubleshooting

### Common Issues

1. **"FROM_EMAIL is not configured" or "SMTP Server: Not configured"**
   - Ensure all environment variables are set
   - Check that FROM_EMAIL includes both username and domain parts

2. **"no local part" Error (501)**
   - Incorrect: `@mysmartscheduler.co`
   - Correct: `noreply@mysmartscheduler.co`

3. **Authentication Failures**
   - Verify SMTP_USER and SMTP_PASS are correct
   - Check if your SMTP server requires specific settings

### Diagnostic Tools

Several diagnostic tools are available in the `server/scripts` directory:

- `smtpConfigCheck.js` - Verify configuration
- `testEmail.js` - Send a basic test email
- `testEmailVerification.js` - Test the verification email flow
- `productionEmailDiagnostic.js` - Comprehensive production diagnostics

Example:
```bash
node server/scripts/testEmail.js recipient@example.com
```

## Production Email Requirements

For production deployment, you'll need:

1. A reliable SMTP server
2. Proper SPF, DKIM records for your sending domain
3. Environment variables correctly set in your hosting environment

See [PRODUCTION-EMAIL-SETUP.md](./PRODUCTION-EMAIL-SETUP.md) for detailed production setup instructions.