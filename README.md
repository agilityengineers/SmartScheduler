# Smart Scheduler Documentation

## Email Configuration

Smart Scheduler uses SMTP for all email communications, including user verification, password resets, and notifications. 

### Required Environment Variables for Email

The following environment variables need to be set for email functionality:

- `FROM_EMAIL`: Email address used as the sender (e.g., `noreply@mysmartscheduler.co`)
- `SMTP_HOST`: SMTP server hostname (e.g., `server.pushbutton-hosting.com`)
- `SMTP_PORT`: SMTP server port (e.g., `465`)
- `SMTP_USER`: SMTP username for authentication (e.g., `noreply@mysmartscheduler.co`)
- `SMTP_PASS`: SMTP password for authentication
- `SMTP_SECURE`: Whether to use TLS/SSL (e.g., `true` for port 465)

See the [Email Configuration Guide](./EMAIL-CONFIGURATION-GUIDE.md) for detailed setup instructions and troubleshooting tools.

## OAuth Configuration

This application uses OAuth 2.0 to connect with Google Calendar and Microsoft Outlook. Follow these instructions to set up your OAuth credentials properly.

### Environment Variables

The following environment variables need to be set:

- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
- `OUTLOOK_CLIENT_ID`: Your Microsoft Azure/Outlook OAuth Client ID
- `OUTLOOK_CLIENT_SECRET`: Your Microsoft Azure/Outlook OAuth Client Secret
- `BASE_URL` (optional): Custom domain URL for your application (defaults to Replit app URL)

### Setting Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "Credentials".
4. Click "Create Credentials" and select "OAuth client ID".
5. Select "Web application" as the application type.
6. Set a name for your client ID.
7. Add Authorized JavaScript Origins:
   - `https://your-replit-app-url.replit.app` (or your custom domain)
8. Add Authorized Redirect URIs:
   - `https://your-replit-app-url.replit.app/api/integrations/google/callback` (or your custom domain)
9. Click "Create".
10. Copy the Client ID and Client Secret and set them as environment variables.

### Setting Up Microsoft Outlook OAuth

1. Go to the [Azure Portal](https://portal.azure.com/#home).
2. Navigate to "App registrations".
3. Click "New registration".
4. Enter a name for your application.
5. Select "Accounts in any organizational directory and personal Microsoft accounts" for supported account types.
6. Set the redirect URI (Web):
   - `https://your-replit-app-url.replit.app/api/integrations/outlook/callback` (or your custom domain)
7. Click "Register".
8. From the overview page, copy the "Application (client) ID".
9. Go to "Certificates & secrets" > "Client secrets" > "New client secret".
10. Create a new client secret and copy its value immediately.
11. Set the Client ID and Client Secret as environment variables.
12. Go to "API permissions" and add the following permissions:
    - Microsoft Graph: Calendars.Read
    - Microsoft Graph: Calendars.ReadWrite
    - Microsoft Graph: User.Read
    - Microsoft Graph: offline_access
13. Click "Grant admin consent" if needed.

### Using a Custom Domain

If you're using a custom domain for your application:

1. Set the `BASE_URL` environment variable to your custom domain.
2. Make sure to update the Authorized JavaScript Origins and Redirect URIs in both Google and Microsoft OAuth configurations to match your custom domain.

### Troubleshooting OAuth Issues

If you encounter issues with OAuth authentication:

1. Check that your Client IDs and Client Secrets are correctly set as environment variables.
2. Verify that your redirect URIs exactly match what's configured in the OAuth providers.
3. Ensure your application has the necessary permissions granted.
4. Check the server logs for detailed OAuth debugging information.
5. If using a custom domain, ensure the `BASE_URL` environment variable is correctly set.

### Testing OAuth Connections

You can test the OAuth flow by:

1. Going to the Settings page in the application.
2. Clicking "Connect Calendar" for either Google or Outlook.
3. Following the OAuth authorization process.
4. Checking the server logs for detailed information on each step of the process.

## Diagnostic Tools

Smart Scheduler includes several diagnostic tools to help troubleshoot configuration issues:

### Email Diagnostics

- `node server/scripts/testEnvironmentVars.js` - Test if environment variables are correctly set
- `node server/scripts/testSmtpEsm.js` - Test SMTP connectivity and authentication
- `node server/scripts/testProductionEnvironment.js` - Test production environment configuration
- `node server/scripts/testVerificationSend.js your-email@example.com` - Test sending a verification email
- `node server/scripts/diagnoseSmtpConfig.js` - Generate a comprehensive diagnostics report

### Email Verification Testing

When testing the account verification system:

1. Register a new account in the application
2. Check the diagnostic logs to see if verification email was sent
3. Run `node server/scripts/testVerificationSend.js your-email@example.com` to manually send a test email
4. Check your email for the verification link and click it to verify

See the [Email Configuration Guide](./EMAIL-CONFIGURATION-GUIDE.md) for detailed troubleshooting steps.