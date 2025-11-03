# Security Guide

## Credential Rotation

### When to Rotate Credentials

Rotate all credentials immediately if:
- Credentials were accidentally committed to version control
- A team member with access leaves the organization
- You suspect credentials may have been compromised
- As part of regular security maintenance (recommended: every 90 days)

### Credentials That Must Be Rotated

#### 1. SendGrid API Key (`SENDGRID_API_KEY`)

**How to rotate:**
1. Log in to your SendGrid account at https://sendgrid.com
2. Navigate to Settings → API Keys
3. Create a new API key with "Mail Send" permission
4. Update the environment variable in your hosting provider (Replit Secrets)
5. Delete the old API key in SendGrid
6. Test email functionality to confirm new key works

**Environment variable:**
```bash
SENDGRID_API_KEY=SG.your-new-api-key-here
```

#### 2. Session Secret (`SESSION_SECRET`)

**How to rotate:**
1. Generate a new secure random string (at least 32 characters)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update the `SESSION_SECRET` environment variable
3. **Note:** This will invalidate all existing user sessions and require all users to log in again

**Environment variable:**
```bash
SESSION_SECRET=your-new-random-string-here
```

#### 3. Database Connection String (`DATABASE_URL`)

**How to rotate:**
1. Access your Neon database console
2. Navigate to Settings → Reset password
3. Update the connection string with the new password
4. Update `DATABASE_URL` in your hosting environment
5. Restart your application

**Environment variable:**
```bash
DATABASE_URL=postgresql://username:newpassword@host/database
```

#### 4. OAuth Client Secrets

**Google Calendar (`GOOGLE_CLIENT_SECRET`):**
1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Select your project
3. Navigate to APIs & Services → Credentials
4. Find your OAuth 2.0 Client ID
5. Click the pencil icon to edit
6. Generate a new client secret
7. Update `GOOGLE_CLIENT_SECRET` environment variable
8. Delete the old secret

**Microsoft Outlook (`OUTLOOK_CLIENT_SECRET`):**
1. Go to Azure Portal (https://portal.azure.com)
2. Navigate to Azure Active Directory → App registrations
3. Select your app
4. Go to Certificates & secrets
5. Create a new client secret
6. Update `OUTLOOK_CLIENT_SECRET` environment variable
7. Delete the old secret

#### 5. Stripe Keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

**API Key rotation:**
1. Log in to Stripe Dashboard (https://dashboard.stripe.com)
2. Go to Developers → API keys
3. Click "Create restricted key" or roll the existing key
4. Update `STRIPE_SECRET_KEY` environment variable
5. Delete the old key

**Webhook secret rotation:**
1. In Stripe Dashboard, go to Developers → Webhooks
2. Click on your webhook endpoint
3. Click "..." → Roll secret
4. Update `STRIPE_WEBHOOK_SECRET` environment variable

### Credential Rotation Checklist

When rotating credentials, follow this checklist:

- [ ] Identify which credential needs rotation
- [ ] Generate/create new credential in the service provider
- [ ] Update environment variable in production hosting (Replit Secrets)
- [ ] Verify application still works with new credential
- [ ] Delete/revoke old credential in the service provider
- [ ] Document the rotation date in your security log
- [ ] If rotating SESSION_SECRET, notify users of required re-login

### Git History Cleanup

If credentials were accidentally committed to git history:

1. **Immediately rotate the exposed credentials** using steps above
2. Remove the credentials from git history using one of these methods:

   **Method 1: BFG Repo-Cleaner (recommended for large repos)**
   ```bash
   # Install BFG
   brew install bfg  # macOS

   # Remove sensitive files
   bfg --delete-files .env
   bfg --delete-files smtp-config.json

   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

   **Method 2: git filter-branch**
   ```bash
   # Remove specific file from history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (WARNING: This rewrites history)
   git push origin --force --all
   git push origin --force --tags
   ```

3. **Important:** All team members must re-clone the repository after history rewrite

4. Verify credentials are removed:
   ```bash
   git log --all -- .env
   # Should return nothing
   ```

### Regular Security Maintenance

**Monthly:**
- [ ] Review access logs for unusual activity
- [ ] Check for any exposed environment variables in logs
- [ ] Verify all team members still require their access level

**Quarterly (Every 90 days):**
- [ ] Rotate all API keys and secrets
- [ ] Review and update this security documentation
- [ ] Audit third-party integrations
- [ ] Review user permissions and roles

**After Team Changes:**
- [ ] Rotate credentials when team members leave
- [ ] Review access control lists
- [ ] Update emergency contact information

### Secure Storage Best Practices

1. **Never commit credentials to version control**
   - Always use environment variables
   - Use `.env` files locally (gitignored)
   - Use Replit Secrets for production

2. **Use separate credentials for different environments**
   - Development credentials (limited permissions)
   - Production credentials (full permissions, restricted access)

3. **Limit credential permissions**
   - Use least-privilege principle
   - Create service-specific credentials
   - Enable only necessary scopes/permissions

4. **Monitor credential usage**
   - Enable logging in service providers
   - Set up alerts for unusual activity
   - Regular audit credential access

### Incident Response

If you discover exposed credentials:

1. **Immediate Actions (within 1 hour):**
   - [ ] Rotate the exposed credential
   - [ ] Check access logs for unauthorized usage
   - [ ] Notify your team lead/security officer

2. **Short-term Actions (within 24 hours):**
   - [ ] Remove credentials from git history if committed
   - [ ] Audit all systems for potential breach
   - [ ] Document the incident

3. **Follow-up Actions (within 1 week):**
   - [ ] Review and improve security procedures
   - [ ] Update team training
   - [ ] Consider additional security measures

### Emergency Contacts

In case of security incident:
- Primary: [Your team lead email]
- Secondary: [Your security officer email]
- Hosting Provider Support: support@replit.com

### Questions?

Refer to:
- [CLAUDE.md](/CLAUDE.md) for general project documentation
- [PRODUCTION_READINESS_AUDIT.md](/PRODUCTION_READINESS_AUDIT.md) for security audit findings
