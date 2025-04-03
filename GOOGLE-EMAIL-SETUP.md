# Setting Up Google Enterprise Email for Smart Scheduler

This guide will walk you through the process of configuring your Smart Scheduler application to use Google Enterprise Email (Gmail for Business) for sending emails.

## Overview

Smart Scheduler now supports two email delivery methods:
1. **Traditional SMTP** (current configuration)
2. **Google Enterprise Email** (new option)

The Google Enterprise Email integration offers several advantages:
- Higher deliverability rates
- Better security (OAuth 2.0 support)
- Detailed delivery statistics
- Reputation management
- Advanced anti-spam measures

## Requirements

To use Google Enterprise Email, you'll need:

1. A Google Workspace account (formerly G Suite)
2. Admin access to your Google Workspace domain
3. A dedicated email address to use for sending emails (e.g., noreply@yourdomain.com)

## Step 1: Create a Dedicated Sender Account

1. Log in to your Google Workspace Admin Console (admin.google.com)
2. Go to "Users" and create a new user (or use an existing one)
3. Recommended: Use a dedicated email like `noreply@yourdomain.com` for automated emails

## Step 2: Enable Access for Less Secure Apps (if needed)

If you're using a regular password (not recommended):

1. Go to the [Less Secure App Access](https://myaccount.google.com/lesssecureapps) setting
2. Enable "Allow less secure apps"

**Note:** This is not recommended for production environments. Use App Passwords instead.

## Step 3: Create an App Password (for accounts with 2FA)

If you have 2-Factor Authentication enabled (recommended):

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select App: "Mail" and Device: "Other (Custom name)"
3. Enter a name like "Smart Scheduler" and click "Generate"
4. Copy the generated 16-character password (no spaces)

## Step 4: Configure Environment Variables

Add these environment variables to your production environment:

```
GOOGLE_EMAIL=noreply@yourdomain.com
GOOGLE_EMAIL_PASSWORD=your-app-password-or-account-password
GOOGLE_EMAIL_NAME=My Smart Scheduler
```

| Variable | Description | Required? |
|----------|-------------|-----------|
| `GOOGLE_EMAIL` | Your Google Workspace email address | Yes |
| `GOOGLE_EMAIL_PASSWORD` | App password or account password | Yes |
| `GOOGLE_EMAIL_NAME` | Display name for email sender | No (Optional) |

## Step 5: Test Your Configuration

Run the test script to verify your Google Email configuration:

```bash
node server/scripts/testGoogleEmailDelivery.js your-test-email@example.com
```

This will:
1. Verify your credentials
2. Check DNS records for your domain
3. Send a test email
4. Confirm the configuration is working

## Step 6: Deploy to Production

Once you've verified the configuration is working locally, deploy the changes to your production environment with the required environment variables.

The system will automatically detect your Google Email configuration and use it for all email communications.

## Fallback Behavior

If Google Email is configured but fails for any reason, the system will automatically fall back to the legacy SMTP configuration. This ensures maximum reliability.

## Troubleshooting

If you encounter issues with Google Email integration:

1. Verify your credentials are correct
2. Check that your Google account has SMTP access enabled
3. If using 2FA, ensure you're using an App Password
4. Verify your domain's SPF and DKIM records are properly configured
5. Check the application logs for detailed error messages

## Need Help?

If you need assistance configuring Google Enterprise Email, please contact our support team.