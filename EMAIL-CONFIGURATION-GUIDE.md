# Smart Scheduler Email Configuration Guide

This document provides a comprehensive guide to configuring email functionality for Smart Scheduler in both development and production environments.

## Table of Contents

1. [Required Environment Variables](#required-environment-variables)
2. [Configuration Files](#configuration-files)
3. [Environment Variable Priority](#environment-variable-priority)
4. [Production Setup](#production-setup)
5. [Development Setup](#development-setup)
6. [Troubleshooting](#troubleshooting)
7. [Diagnostic Tools](#diagnostic-tools)

## Required Environment Variables

Smart Scheduler requires the following environment variables for email functionality:

| Variable | Description | Example |
|----------|-------------|---------|
| `FROM_EMAIL` | Email address used as the sender | `noreply@mysmartscheduler.co` |
| `SMTP_HOST` | SMTP server hostname | `server.pushbutton-hosting.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | SMTP username for authentication | `noreply@mysmartscheduler.co` |
| `SMTP_PASS` | SMTP password for authentication | `your-secure-password` |
| `SMTP_SECURE` | Whether to use TLS/SSL | `true` |

**Important Notes:**
- `FROM_EMAIL` and `SMTP_USER` should typically match for best email deliverability.
- `SMTP_SECURE` should be `true` for port 465 and typically `false` for port 587.

## Configuration Files

Smart Scheduler can load configuration from two types of files:

1. **Environment Files (`.env`):**
   - `.env.production` - Used in production environment
   - `.env.development` - Used in development environment
   - `.env` - Fallback for any environment

2. **SMTP Configuration Files:**
   - `/smtp-config.json` - Root directory configuration
   - `/server/smtp-config.json` - Server directory configuration

Example `smtp-config.json`:
```json
{
  "FROM_EMAIL": "noreply@mysmartscheduler.co",
  "SMTP_HOST": "server.pushbutton-hosting.com",
  "SMTP_PORT": "465",
  "SMTP_USER": "noreply@mysmartscheduler.co",
  "SMTP_PASS": "your-actual-password",
  "SMTP_SECURE": "true",
  "comment": "IMPORTANT: In production, use environment variables or secrets instead of this file!"
}
```

**Security Note:** Do not commit files containing real passwords to version control.

## Environment Variable Priority

Smart Scheduler loads configuration in the following order (highest priority first):

1. **Existing Environment Variables**
   - Already set in the system environment

2. **Environment Files**
   - `.env.{NODE_ENV}` (e.g., `.env.production` or `.env.development`)
   - `.env.production` (fallback)
   - `.env` (fallback)

3. **SMTP Configuration Files**
   - `/smtp-config.json`
   - `/server/smtp-config.json`

4. **Hardcoded Defaults**
   - Last resort fallback values

Variables set by a higher priority source will not be overwritten by lower priority sources.

## Production Setup

For production environments:

1. **Set Environment Variables on Your Hosting Platform:**
   - Use your hosting provider's secrets or environment variable management system
   - Ensure all required variables are set, especially `SMTP_PASS`

2. **Verify Configuration:**
   - Run the diagnostic tools (described below) to ensure proper setup
   - Verify that verification emails can be sent and received
   - Check that verification links work correctly

**Example Replit Setup:**
- Go to the "Secrets" tab in your Repl
- Add all required variables as secrets
- Restart your Repl after adding secrets

## Development Setup

For development environments:

1. **Create a Local Configuration File:**
   - Copy the example `smtp-config.json` to your project root
   - Fill in your SMTP credentials

2. **Or Use Environment Variables:**
   - Create a `.env` file with your configuration
   - Make sure not to commit this file to version control

## Troubleshooting

### Common Issues and Solutions

1. **Emails Not Sending:**
   - Verify SMTP credentials are correct
   - Check if your IP is blocked by the SMTP server
   - Ensure port 465 or 587 is not blocked by firewall
   - Verify `FROM_EMAIL` matches `SMTP_USER` unless your provider requires different values

2. **Invalid Verification Links:**
   - Check if the base URL in verification links is correct
   - Ensure token generation and verification is working
   - Check for cross-environment issues (different URLs in dev/prod)

3. **SSL/TLS Errors:**
   - Ensure `SMTP_SECURE` is set correctly
   - Use `true` for port 465 and typically `false` for port 587
   - Try both settings if you're unsure

### Debugging Steps

1. Run the diagnostic tools (see below)
2. Check server logs for any SMTP-related errors
3. Test SMTP connectivity from your environment
4. Verify that environment variables are correctly loaded
5. Try sending a test email to confirm everything works

## Diagnostic Tools

Smart Scheduler includes several diagnostic tools to help troubleshoot email issues:

### Environment Variables Test

Tests if your environment variables are correctly loaded:

```bash
node server/scripts/testEnvironmentVars.js
```

### SMTP Connectivity Test

Tests if your SMTP server is reachable and credentials are valid:

```bash
node server/scripts/testSmtpEsm.js
```

### Production Environment Test

Performs a comprehensive check of the production environment:

```bash
node server/scripts/testProductionEnvironment.js
```

### Verification Email Test

Tests sending a verification email to a specified address:

```bash
node server/scripts/testVerificationSend.js your-test-email@example.com
```

### Full Diagnostics

Generate a comprehensive diagnostics report:

```bash
node server/scripts/diagnoseSmtpConfig.js
```