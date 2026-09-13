# Google OAuth Configuration Guide for SmartScheduler

## Find Your Live Configuration First

> **Do not trust a client ID written down in a document — including this one.**
> An earlier version of this file hardcoded a client ID that had gone stale, and
> it cost a debugging session: the URI was registered on the documented client
> while the server was authenticating as a different one. Read the live values
> from the running app every time.

**The authoritative source is the deployed server.** Logged in, open:

```
https://smart-scheduler.ai/api/integrations/config-status
```

It returns, per provider, whether credentials are present and the **exact**
redirect URI being sent (`server/routes.ts:3279` → `getOAuthConfigStatus` in
`server/utils/oauthUtils.ts:169`). That redirect URI must match the provider
console byte for byte.

**To see which OAuth client the server is actually using**, open (while logged in):

```
https://smart-scheduler.ai/api/integrations/google/auth
```

and read `client_id=` out of the returned `authUrl`. The server also logs it on
every attempt: `[OAuth:Google] Creating OAuth2 client with { clientId: ... }`.

> **The digits before the dash in a client ID are the Google Cloud project
> number.** A client `209561208839-xxxx.apps.googleusercontent.com` lives in the
> project whose *project number* is `209561208839` — not necessarily the project
> you have open. Look it up in the Project number column at
> https://console.cloud.google.com/cloud-resource-manager. Note that the trailing
> digits in a project *ID* like `smartscheduler-456220` are a random uniqueness
> suffix, NOT the project number.

### 🔑 Required Redirect URI

Based on the BASE_URL configuration, the **authorized redirect URI** must be:

```
https://smart-scheduler.ai/api/integrations/google/callback
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
   https://smart-scheduler.ai
   ```
6. Under **Authorized redirect URIs**, add EXACTLY:
   ```
   https://smart-scheduler.ai/api/integrations/google/callback
   ```
7. Click **Create**
8. **Copy your credentials**:
   - Client ID (starts with a number, ends with `.apps.googleusercontent.com`)
   - Client Secret (random string)

### 5. Update Environment Variables (if needed)

Read the live Client ID from `/api/integrations/google/auth` (above) rather than
from any value written here.

⚠️ **Replit keeps workspace secrets and deployment secrets separately.** The app
served at `smart-scheduler.ai` reads the *deployment* secrets. Setting a value in
the workspace only will not change what the deployed app sends, and it will look
like your edit had no effect.

**If you created NEW credentials**, update them in Replit Secrets (deployment
scope) or `.env`, then redeploy:
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
- [ ] Authorized redirect URI is EXACTLY: `https://smart-scheduler.ai/api/integrations/google/callback`
- [ ] Client ID in Google Console matches your `GOOGLE_CLIENT_ID` environment variable
- [ ] Google Calendar API is enabled in your project

### ✅ Environment Variables Verification

Run these commands in your Replit shell:

```bash
# Verify Client ID (run in the environment that is actually failing)
echo $GOOGLE_CLIENT_ID

# Compare against the client you edited in Google Cloud Console.
# They must match character for character.

# Verify Client Secret is set (won't show value)
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then echo "✅ GOOGLE_CLIENT_SECRET is set"; else echo "❌ GOOGLE_CLIENT_SECRET is NOT set"; fi

# Verify BASE_URL
echo $BASE_URL

# Should output: https://smart-scheduler.ai
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

Google compares the redirect URI as a literal string. Work it in this order:

1. **Read what was actually sent.** On Google's error page click **error details** —
   it prints the exact `redirect_uri`. Do not guess it.
2. **Compare to the server.** `/api/integrations/config-status` → `google.redirectUri`.
   If these two differ, the bug is server-side (see BASE_URL traps below).
3. **If they match, the bug is in the console** — the URI is not registered on the
   client the server authenticates as. Identify that client via
   `/api/integrations/google/auth`, then find its project by project number.
   *Registering the URI on the wrong client is the single most common cause of a
   mismatch that survives "but I already added it".*
4. **Check the right box.** The URI belongs in **Authorized redirect URIs**, not
   **Authorized JavaScript origins** (origins reject paths).
5. **Confirm the save stuck.** Save, then reload the page and look again. A
   validation error elsewhere on the form silently blocks the save.
6. **Wait.** Google allows 5 minutes to a few hours for propagation.

**BASE_URL traps (server side).** `getBaseUrl()` falls through: `BASE_URL` env var
→ Replit URL → `http://localhost:5000`.
- `BASE_URL` unset in the *deployment* → production sends the Replit or localhost
  URL. Most common server-side cause.
- **Trailing slash on `BASE_URL`** → `https://smart-scheduler.ai//api/...` (double
  slash). There is no slash normalization in the code. Nearly invisible in logs.
- `BASE_URL` containing `mysmartscheduler.co` is **ignored** and forced to
  `https://smart-scheduler.ai` (deprecated-domain guard, `oauthUtils.ts:16-34`).

**Error: "The OAuth client does not exist"** when opening a client URL in the
console. Either you pasted only the numeric prefix instead of the full client ID,
or the client lives in a project you do not currently have selected (or under a
different Google account), or it was deleted. Look it up by project number in the
Cloud Resource Manager.

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
[OAuth:Config] BASE_URL configured as https://smart-scheduler.ai
[OAuth:Google] Creating OAuth2 client with { clientId: '...', redirectUri: 'https://smart-scheduler.ai/api/integrations/google/callback' }
[OAuth:Google] Generated Auth URL https://accounts.google.com/o/oauth2/v2/auth?...
[OAuth:Google] Exchanging authorization code for tokens
[OAuth:Google] Successfully obtained tokens
```

**Error logs to watch for**:
- `redirect_uri_mismatch` - Redirect URI not configured correctly
- `invalid_client` - Client ID/Secret mismatch
- `invalid_grant` - Authorization code expired or already used

---

## Custom Domain Configuration (smart-scheduler.ai)

Since you're using a custom domain (`smart-scheduler.ai`), ensure:

### 1. DNS Configuration
- Your domain's DNS points to your Replit deployment
- SSL/TLS certificate is valid for `smart-scheduler.ai`
- HTTPS is enforced (OAuth requires HTTPS for production)

### 2. Replit Custom Domain Setup
1. In Replit, go to your project
2. Click **Settings** (gear icon)
3. Go to **Domains**
4. Add `smart-scheduler.ai` as a custom domain
5. Follow Replit's instructions for DNS configuration

### 3. Verify BASE_URL Points to Custom Domain
Your `BASE_URL` is correctly set to `https://smart-scheduler.ai`

---

## Alternative: Using Replit URL for Testing

If you want to test with the Replit URL instead of the custom domain. The URL
below is an **example** — get your real one from `getBaseUrl()`'s Replit fallback
(`https://${REPL_SLUG}.${REPL_OWNER}.replit.app`) or from
`/api/integrations/config-status`:

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
| Client ID | Read live from `/api/integrations/google/auth` | Google Cloud Console → Credentials |
| Client Secret | (hidden) | Google Cloud Console → Credentials |
| Redirect URI | `https://smart-scheduler.ai/api/integrations/google/callback` | Google Console → OAuth Client → Redirect URIs |
| Base URL | `https://smart-scheduler.ai` | Replit Secrets or `.env` |
| Scopes | calendar, calendar.events, profile, email | `server/utils/oauthUtils.ts:76` (`GOOGLE_SCOPES`) |

---

## Need More Help?

### Documentation Links
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
- [OAuth Playground (Testing)](https://developers.google.com/oauthplayground/)

### In Your Codebase
- OAuth implementation: `server/utils/oauthUtils.ts`
  - `getBaseUrl()` — line 27 (BASE_URL → Replit URL → localhost fallback chain)
  - `getGoogleRedirectUri()` — line 55
  - `getGoogleCredentials()` — line 118 (multi-domain credential lookup)
  - `GOOGLE_SCOPES` — line 76
- Google Calendar service: `server/calendarServices/googleCalendar.ts`
  - `revokeAndClear()` — line 951 (revoke + token deletion on disconnect)
- OAuth routes: `server/routes.ts`
  - `/api/integrations/config-status` — line 3279
  - `/api/integrations/google/auth` — line 3290
  - `/api/integrations/google/callback` — line 3306

### Testing Tools
```bash
# Test OAuth URL generation
npm run dev
# Then navigate to: https://smart-scheduler.ai/integrations
# Click "Connect Google Calendar"
# Copy the redirect URL from browser and verify it matches
```
