# Google OAuth Configuration Guide for SmartScheduler

## Current Configuration Status

### ✅ Environment Variables Configured

Your current setup:
- **GOOGLE_CLIENT_ID**: `153516560694-9ffsc4hfp2qbipd8bisq9rpb0uvqc2gu.apps.googleusercontent.com`
- **GOOGLE_CLIENT_SECRET**: ✅ Set (value hidden for security)
- **BASE_URL**: `https://mysmartscheduler.co`
- **Fallback Replit URL**: `https://workspace.cw-devapp.replit.app`

### 🔑 Required Redirect URI

Based on your BASE_URL configuration, your **authorized redirect URI** must be:

```
https://mysmartscheduler.co/api/integrations/google/callback
```

**IMPORTANT**: This redirect URI must be EXACTLY configured in your Google Cloud Console OAuth 2.0 Client. Even a trailing slash difference will cause authentication to fail.

---

## Google Cloud Console Setup (Step-by-Step)

### 1. Access Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Navigate to: **APIs & Services** → **Credentials**

### 2. Configure OAuth Consent Screen (Required First)

Before creating OAuth credentials, you must configure the consent screen:

1. Click **OAuth consent screen** in the left sidebar
2. Select **User Type**:
   - **External**: For public apps (anyone with a Google account can use it)
   - **Internal**: For Google Workspace organizations only
3. Fill in required fields:
   - **App name**: SmartScheduler (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact**: Your email address
4. Click **Save and Continue**

### 3. Add Required Scopes

On the "Scopes" page, add these scopes:

**Required OAuth Scopes** (your app uses these):
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Calendar events management
- `profile` - User profile information
- `email` - User email address

Click **Add or Remove Scopes**, search for these, select them, and click **Update**.

### 4. Create OAuth 2.0 Credentials

1. Go to **Credentials** tab
2. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Application Type**: **Web application**
4. Set **Name**: `SmartScheduler OAuth Client` (or your preference)
5. Under **Authorized JavaScript origins**, add:
   ```
   https://mysmartscheduler.co
   ```
6. Under **Authorized redirect URIs**, add EXACTLY:
   ```
   https://mysmartscheduler.co/api/integrations/google/callback
   ```
7. Click **Create**
8. **Copy your credentials**:
   - Client ID (starts with a number, ends with `.apps.googleusercontent.com`)
   - Client Secret (random string)

### 5. Update Environment Variables (if needed)

Your credentials are already set:
- Current Client ID: `153516560694-9ffsc4hfp2qbipd8bisq9rpb0uvqc2gu.apps.googleusercontent.com`
- Current Client Secret: Already configured

**If you created NEW credentials**, update them in Replit Secrets or `.env`:
```bash
GOOGLE_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-new-client-secret
```

---

## Verification Checklist

### ✅ Google Cloud Console Verification

Log into Google Cloud Console and verify:

- [ ] OAuth consent screen is configured
- [ ] App name matches your application
- [ ] Scopes include:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.events`
  - `profile`
  - `email`
- [ ] OAuth 2.0 Client ID exists
- [ ] Authorized redirect URI is EXACTLY: `https://mysmartscheduler.co/api/integrations/google/callback`
- [ ] Client ID in Google Console matches your `GOOGLE_CLIENT_ID` environment variable
- [ ] Google Calendar API is enabled in your project

### ✅ Environment Variables Verification

Run these commands in your Replit shell:

```bash
# Verify Client ID
echo $GOOGLE_CLIENT_ID

# Should output: 153516560694-9ffsc4hfp2qbipd8bisq9rpb0uvqc2gu.apps.googleusercontent.com

# Verify Client Secret is set (won't show value)
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then echo "✅ GOOGLE_CLIENT_SECRET is set"; else echo "❌ GOOGLE_CLIENT_SECRET is NOT set"; fi

# Verify BASE_URL
echo $BASE_URL

# Should output: https://mysmartscheduler.co
```

### ✅ Enable Google Calendar API

**CRITICAL**: You must enable the Google Calendar API in your Google Cloud project:

1. Go to: https://console.cloud.google.com/apis/library
2. Search for: **Google Calendar API**
3. Click on it
4. Click **ENABLE**
5. Verify it shows as "Enabled" (not just in the library)

Without this, OAuth will succeed but calendar operations will fail with 403 errors.

---

## Testing the OAuth Flow

### 1. Test in Your Application

1. Log into your SmartScheduler application
2. Navigate to: **Settings** → **Integrations** or `/integrations`
3. Click **Connect Google Calendar**
4. You should be redirected to Google's consent screen
5. Grant permissions
6. You should be redirected back to your app successfully

### 2. Debug OAuth Issues

If the OAuth flow fails, check the following:

**Common Error: "redirect_uri_mismatch"**
- **Cause**: Redirect URI in Google Console doesn't match what your app is sending
- **Fix**: Ensure redirect URI is EXACTLY: `https://mysmartscheduler.co/api/integrations/google/callback`
- **Check**: No trailing slashes, correct protocol (https), correct domain

**Common Error: "access_denied"**
- **Cause**: User denied permissions or app is not verified
- **Fix**:
  - If testing, click "Advanced" → "Go to SmartScheduler (unsafe)"
  - For production, submit for Google verification (required for public apps)

**Common Error: "invalid_client"**
- **Cause**: Client ID or Client Secret mismatch
- **Fix**: Verify environment variables match Google Console credentials exactly

### 3. Check Server Logs

When testing OAuth, watch your Replit console for OAuth debug logs:

```
[OAuth:Config] BASE_URL configured as https://mysmartscheduler.co
[OAuth:Google] Creating OAuth2 client with { clientId: '...', redirectUri: 'https://mysmartscheduler.co/api/integrations/google/callback' }
[OAuth:Google] Generated Auth URL https://accounts.google.com/o/oauth2/v2/auth?...
[OAuth:Google] Exchanging authorization code for tokens
[OAuth:Google] Successfully obtained tokens
```

**Error logs to watch for**:
- `redirect_uri_mismatch` - Redirect URI not configured correctly
- `invalid_client` - Client ID/Secret mismatch
- `invalid_grant` - Authorization code expired or already used

---

## Custom Domain Configuration (mysmartscheduler.co)

Since you're using a custom domain (`mysmartscheduler.co`), ensure:

### 1. DNS Configuration
- Your domain's DNS points to your Replit deployment
- SSL/TLS certificate is valid for `mysmartscheduler.co`
- HTTPS is enforced (OAuth requires HTTPS for production)

### 2. Replit Custom Domain Setup
1. In Replit, go to your project
2. Click **Settings** (gear icon)
3. Go to **Domains**
4. Add `mysmartscheduler.co` as a custom domain
5. Follow Replit's instructions for DNS configuration

### 3. Verify BASE_URL Points to Custom Domain
Your `BASE_URL` is correctly set to `https://mysmartscheduler.co`

---

## Alternative: Using Replit URL for Testing

If you want to test with the Replit URL instead of custom domain:

### Update Environment Variable
```bash
BASE_URL=https://workspace.cw-devapp.replit.app
```

### Update Google Console Redirect URI
Change authorized redirect URI to:
```
https://workspace.cw-devapp.replit.app/api/integrations/google/callback
```

**Note**: You can have MULTIPLE redirect URIs configured in Google Console. Add both if you want to support both URLs.

---

## Security Considerations

### 🔒 Protect Your Credentials

- **NEVER commit** `GOOGLE_CLIENT_SECRET` to version control
- Use Replit Secrets or environment variables only
- Rotate credentials if they're ever exposed

### 🔒 Scope Principle of Least Privilege

Your app requests these scopes:
- `calendar` - Full calendar access (read/write)
- `calendar.events` - Event management
- `profile` - User identification
- `email` - User email (for account linking)

**Only request scopes you actually need**. Your current configuration is appropriate for a scheduling application.

### 🔒 OAuth State Parameter

Your implementation uses the `state` parameter for:
- CSRF protection
- Passing custom calendar name

This is secure and follows OAuth best practices.

---

## Troubleshooting Guide

### Issue: "This app isn't verified"

**Why it happens**: Google shows this warning for apps that haven't been verified by Google.

**For testing**:
1. Click **Advanced**
2. Click **Go to SmartScheduler (unsafe)**
3. Grant permissions

**For production**:
- Submit your app for Google's verification process
- Required when your app has >100 users
- Process takes 3-7 days
- See: https://support.google.com/cloud/answer/7454865

### Issue: OAuth works but calendar sync fails

**Possible causes**:
1. Google Calendar API not enabled in Google Cloud Console
2. Invalid or expired access token
3. Insufficient permissions (check scopes)

**Debug steps**:
1. Check server logs for API errors
2. Verify token in database has `accessToken` and `refreshToken`
3. Enable Google Calendar API in console
4. Re-authenticate to get fresh tokens

### Issue: Redirect after OAuth goes to wrong URL

**Check**:
1. `BASE_URL` environment variable
2. Verify it matches your actual domain
3. If using custom domain, ensure DNS is configured
4. Check for typos (http vs https, trailing slashes)

---

## Quick Reference

| Configuration Item | Current Value | Where to Configure |
|-------------------|---------------|-------------------|
| Client ID | `153516560694-...googleusercontent.com` | Google Cloud Console → Credentials |
| Client Secret | (hidden) | Google Cloud Console → Credentials |
| Redirect URI | `https://mysmartscheduler.co/api/integrations/google/callback` | Google Console → OAuth Client → Redirect URIs |
| Base URL | `https://mysmartscheduler.co` | Replit Secrets or `.env` |
| Scopes | calendar, calendar.events, profile, email | server/utils/oauthUtils.ts (line 55-60) |

---

## Need More Help?

### Documentation Links
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
- [OAuth Playground (Testing)](https://developers.google.com/oauthplayground/)

### In Your Codebase
- OAuth implementation: `/server/utils/oauthUtils.ts`
- Google Calendar service: `/server/calendarServices/googleCalendar.ts`
- OAuth routes: `/server/routes.ts` (lines 2796-2850)

### Testing Tools
```bash
# Test OAuth URL generation
npm run dev
# Then navigate to: https://mysmartscheduler.co/integrations
# Click "Connect Google Calendar"
# Copy the redirect URL from browser and verify it matches
```
