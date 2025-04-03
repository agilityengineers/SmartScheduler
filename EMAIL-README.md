# Email Configuration for Smart Scheduler

Smart Scheduler supports two methods for sending emails:

1. **Google Enterprise Email** (Recommended)
2. **Legacy SMTP Server**

## Google Enterprise Email (New)

Google Enterprise Email offers several advantages:
- Higher deliverability rates
- Better security and authentication
- Detailed sending statistics
- Advanced spam protection
- Easy setup with Google Workspace (G Suite)

### Setting Up Google Enterprise Email

To set up Google Enterprise Email, use the interactive setup script:

```bash
node server/scripts/setupGoogleEmail.js
```

This will:
1. Guide you through connecting to your Google Workspace account
2. Create and test the configuration
3. Save the settings to your environment

### Alternative Setup for Google Email

If you prefer to set up Google Email manually:

1. Create a dedicated email in your Google Workspace account (e.g., noreply@yourdomain.com)
2. Create an App Password (if 2FA is enabled)
3. Set these environment variables:
   ```
   GOOGLE_EMAIL=your-email@your-domain.com
   GOOGLE_EMAIL_PASSWORD=your-app-password
   GOOGLE_EMAIL_NAME=Your Name (optional)
   ```
4. Test the configuration:
   ```bash
   node server/scripts/testGoogleEmailDelivery.js your-test-email@example.com
   ```

For detailed setup instructions, see [GOOGLE-EMAIL-SETUP.md](GOOGLE-EMAIL-SETUP.md).

## Legacy SMTP Server (Original Method)

For backwards compatibility, Smart Scheduler still supports the original SMTP configuration method:

1. Set these environment variables:
   ```
   FROM_EMAIL=noreply@yourdomain.com
   SMTP_HOST=your-smtp-server.com
   SMTP_PORT=465
   SMTP_USER=your-username
   SMTP_PASS=your-password
   SMTP_SECURE=true
   ```
2. Test the configuration:
   ```bash
   node server/scripts/productionEmailDiagnostic.js your-test-email@example.com
   ```

## Email System Behavior

The email system has the following behavior:

1. If Google Enterprise Email is configured, it will be used as the primary email delivery method
2. If Google Email fails or is not configured, the system will fall back to the legacy SMTP method
3. In development mode, if both methods fail, the system will use Ethereal for test emails

## Troubleshooting

If you encounter email delivery issues:

1. Run the appropriate test script to diagnose the problem:
   - For Google Email: `node server/scripts/testGoogleEmailDelivery.js your-email@example.com`
   - For Legacy SMTP: `node server/scripts/productionEmailDiagnostic.js your-email@example.com`

2. Check that your environment variables are set correctly

3. For Google Email issues:
   - Ensure you're using an App Password if 2FA is enabled
   - Verify your Google Workspace account has SMTP access enabled

4. For Legacy SMTP issues:
   - Verify your SMTP server credentials
   - Check if your SMTP server requires special configuration