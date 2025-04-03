# Production Email Setup Guide

## Overview
This guide provides comprehensive instructions for setting up email functionality in the production environment of your SmartScheduler application. The email system is used for critical communications including registration verification, booking confirmations, and team notifications.

## Problem Summary
Our application was experiencing email delivery issues in production, despite working correctly in development. The root cause was identified as an issue with the SMTP password configuration. This guide ensures proper setup in production.

## Required Environment Variables

The following environment variables must be correctly set in your production environment:

```
FROM_EMAIL=noreply@mysmartscheduler.co
SMTP_HOST=server.pushbutton-hosting.com
SMTP_PORT=465
SMTP_USER=noreply@mysmartscheduler.co
SMTP_SECURE=true
SMTP_PASS=Success2025
```

## Setting Up Production Environment

### Option 1: Using a .env File
Create a `.env` file in your production environment:

1. Create or edit the `.env` file in your production server
2. Add all the required environment variables listed above
3. Ensure this file is secure and not tracked in version control

Example `.env` file:
```
FROM_EMAIL=noreply@mysmartscheduler.co
SMTP_HOST=server.pushbutton-hosting.com
SMTP_PORT=465
SMTP_USER=noreply@mysmartscheduler.co
SMTP_SECURE=true
SMTP_PASS=Success2025
```

### Option 2: Using Hosting Provider Dashboard
Most hosting providers offer an interface to set environment variables:

- **Vercel**: Go to Project Settings → Environment Variables
- **Heroku**: Go to Settings → Config Vars
- **Netlify**: Go to Site settings → Build & deploy → Environment
- **DigitalOcean**: Go to App → Settings → Environment Variables

Enter each of the required variables individually in the interface provided by your hosting service.

### Option 3: Command Line Setup
Set the variables directly through the command line before starting your application:

```bash
export FROM_EMAIL=noreply@mysmartscheduler.co
export SMTP_HOST=server.pushbutton-hosting.com
export SMTP_PORT=465
export SMTP_USER=noreply@mysmartscheduler.co
export SMTP_SECURE=true
export SMTP_PASS=Success2025
```

## Verification Process

After setting up your environment, follow these steps to verify email functionality:

### 1. Test Environment Variable Configuration
```bash
NODE_ENV=production node server/scripts/testProductionEnvironment.js
```

You should see all variables verified with "✅" indicators.

### 2. Test Basic Email Delivery
```bash
NODE_ENV=production node server/scripts/testProductionEmailDelivery.js your@email.com
```

Replace `your@email.com` with a real email address where you can check for receipt.

### 3. Test Registration Email Flow
```bash
NODE_ENV=production node server/scripts/testProductionRegistration.js your@email.com
```

This tests the complete registration email flow including verification link generation.

## Troubleshooting

If you encounter issues after following this setup:

### SMTP Authentication Failures
- Verify that `SMTP_USER` and `SMTP_PASS` are correct
- Ensure no extra spaces or characters in the password
- Contact your email provider to confirm credentials

### Connection Issues
- Check for firewalls blocking outgoing email (port 465)
- Verify network connectivity to the SMTP server
- Try a different port if your provider supports alternatives

### Rate Limiting
- Some providers limit the number of emails you can send
- Implement a queue system if sending large volumes
- Spread email sending over time

## Ongoing Maintenance

- Regularly test your email system
- Monitor delivery rates and bounces
- Consider implementing email logging
- Set up alerts for email system failures

## Support

If you need additional help, contact:
- Your email service provider
- Your hosting platform support
- The SmartScheduler development team

---

Document created: April 2025