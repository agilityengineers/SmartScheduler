# Testing Google OAuth Flow - Step-by-Step Guide

## Method 1: Manual Testing (Recommended for First Test)

### Step 1: Start Your Development Server

```bash
npm run dev
```

Wait for the server to start. You should see:
```
Server running on port 5000
```

### Step 2: Access Your Application

Open your browser and navigate to:
```
https://smart-scheduler.ai
```

Or if testing locally:
```
http://localhost:5000
```

### Step 3: Login to Your Application

1. If not logged in, go to `/login`
2. Enter your credentials
3. You should be redirected to the main dashboard

### Step 4: Navigate to Integrations Page

Go to one of these URLs:
- `https://smart-scheduler.ai/integrations`
- `https://smart-scheduler.ai/settings` (then click Integrations tab)

### Step 5: Initiate Google OAuth

1. Look for **"Connect Google Calendar"** or **"Add Calendar"** button
2. Click it
3. **What should happen**:
   - You'll be redirected to Google's OAuth consent screen
   - URL will be: `https://accounts.google.com/o/oauth2/v2/auth?...`

### Step 6: Grant Permissions

On Google's consent screen:

1. **Select your Google account**
2. **Review permissions requested**:
   - View and edit events on all your calendars
   - See your primary Google Account email address
   - See your personal info
3. **Click "Allow"** or **"Continue"**

⚠️ **If you see "This app isn't verified"**:
- This is normal for apps in development/testing
- Click **"Advanced"**
- Click **"Go to SmartScheduler (unsafe)"**
- Then grant permissions

### Step 7: Verify Successful Redirect

After granting permissions:

1. **You should be redirected back to**: `https://smart-scheduler.ai/settings` or `/integrations`
2. **You should see**:
   - Success message or toast notification
   - Your Google Calendar listed as "Connected"
   - A sync status indicator

### Step 8: Test Calendar Sync

1. Click **"Sync Calendar"** button next to your connected Google Calendar
2. **Expected result**:
   - Loading indicator appears
   - Events from your Google Calendar appear in SmartScheduler
   - "Last synced: Just now" timestamp updates

---

## Method 2: Testing with Browser Developer Tools

### Monitor Network Traffic

1. Open your browser's Developer Tools (F12)
2. Go to **Network** tab
3. Follow Steps 1-5 from Method 1
4. **Watch for these requests**:

**Request 1: Get Auth URL**
```
GET /api/integrations/google/auth
Response: { "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...", "name": "..." }
```

**Request 2: OAuth Callback**
```
GET /api/integrations/google/callback?code=...&state=...
Expected: 302 Redirect to /settings or /integrations
```

**Request 3: Verify Connection**
```
GET /api/integrations
Response: Should include your Google Calendar integration
```

### Check for Errors

In the **Console** tab, look for:
- ✅ No errors (good!)
- ❌ Red errors (investigate these)
- 🟡 OAuth debug messages (helpful for troubleshooting)

---

## Method 3: Server-Side Log Monitoring

### Watch Server Logs in Real-Time

In your terminal where `npm run dev` is running, watch for these log messages:

**When you click "Connect Google Calendar":**
```
[OAuth:Config] BASE_URL configured as https://smart-scheduler.ai
[OAuth:Google] Creating OAuth2 client with { clientId: '...', redirectUri: 'https://smart-scheduler.ai/api/integrations/google/callback' }
[OAuth:Google] Redirect URI https://smart-scheduler.ai/api/integrations/google/callback
[OAuth:Google] Client ID available true
[OAuth:Google] Client Secret available true
[OAuth:Google] Generated Auth URL https://accounts.google.com/o/oauth2/v2/auth?...
```

**After you grant permissions (OAuth callback):**
```
Google auth callback received with params: { code: '...', state: '...' }
[OAuth:Google] Exchanging authorization code for tokens
[OAuth:Google] Successfully obtained tokens
```

**When syncing calendar:**
```
[GoogleCalendarService] Syncing events with Google Calendar
[GoogleCalendarService] Using calendar ID: primary
[GoogleCalendarService] Found X events in Google Calendar
[GoogleCalendarService] Found Y events in local database
[GoogleCalendarService] Creating Z new events in local database
[GoogleCalendarService] Sync completed successfully
```

### Look for Error Logs

**❌ OAuth Errors:**
```
[OAuth:Google] Error exchanging authorization code for tokens
[OAuth:Google] OAuth error response { status: 400, data: { error: 'redirect_uri_mismatch' } }
```

**❌ API Errors:**
```
[GoogleCalendarService] Error syncing events with Google Calendar
[GoogleCalendarService] Error response { status: 403, message: 'Calendar API has not been used...' }
```

---

## Method 4: Automated Testing with cURL

### Test 1: Check Auth URL Generation

```bash
# Get the auth URL (requires session cookie)
curl -X GET 'https://smart-scheduler.ai/api/integrations/google/auth' \
  -H 'Cookie: connect.sid=YOUR_SESSION_COOKIE' \
  -v
```

**Expected Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "name": "My Google Calendar"
}
```

### Test 2: Verify the Auth URL

Copy the `authUrl` from the response and check it contains:
- `client_id=153516560694-9ffsc4hfp2qbipd8bisq9rpb0uvqc2gu.apps.googleusercontent.com`
- `redirect_uri=https%3A%2F%2Fsmart-scheduler.ai%2Fapi%2Fintegrations%2Fgoogle%2Fcallback`
- `scope=...calendar...`
- `access_type=offline`
- `prompt=consent`

---

## Method 5: Database Verification

After successfully connecting Google Calendar, verify the integration was saved:

### Using PostgreSQL Query

```bash
# Connect to your database
psql $DATABASE_URL

# Check calendar integrations
SELECT id, "userId", type, name, "isConnected", "isPrimary", "lastSynced"
FROM "calendarIntegrations"
WHERE type = 'google';
```

**Expected Output:**
```
 id | userId | type   | name               | isConnected | isPrimary | lastSynced
----+--------+--------+--------------------+-------------+-----------+------------
  1 |      1 | google | My Google Calendar | t           | f         | 2025-02-01...
```

### Verify Token Storage

```sql
-- Check that tokens are stored (don't display them for security)
SELECT id, "userId", type,
       LENGTH("accessToken") as access_token_length,
       LENGTH("refreshToken") as refresh_token_length,
       "expiresAt"
FROM "calendarIntegrations"
WHERE type = 'google';
```

**Expected Output:**
```
 id | userId | type   | access_token_length | refresh_token_length | expiresAt
----+--------+--------+--------------------+---------------------+------------
  1 |      1 | google | 150                | 80                  | 2025-02-01...
```

✅ Both tokens should have length > 0

---

## What to Look For: Success Indicators

### ✅ OAuth Flow Success

- [ ] Redirect to Google consent screen works
- [ ] No "redirect_uri_mismatch" error
- [ ] Can grant permissions successfully
- [ ] Redirected back to SmartScheduler
- [ ] Google Calendar shows as "Connected" in UI
- [ ] Integration saved in database with `isConnected = true`
- [ ] Both `accessToken` and `refreshToken` are stored
- [ ] `expiresAt` timestamp is in the future

### ✅ Calendar Sync Success

- [ ] "Sync Calendar" button works without errors
- [ ] Events from Google Calendar appear in SmartScheduler
- [ ] `lastSynced` timestamp updates
- [ ] No 403 errors in server logs
- [ ] Event count in logs shows events were fetched

---

## Common Test Failures & Solutions

### Failure 1: "redirect_uri_mismatch" Error

**Error Message:**
```
Error 400: redirect_uri_mismatch
```

**Diagnosis:**
The redirect URI in your request doesn't match what's configured in Google Console.

**Check:**
1. Run: `bash scripts/verify-google-oauth.sh`
2. Note the redirect URI it shows
3. Go to Google Cloud Console → Credentials → Your OAuth Client
4. Verify the EXACT redirect URI is listed under "Authorized redirect URIs"

**Fix:**
Add the exact redirect URI to Google Console:
```
https://smart-scheduler.ai/api/integrations/google/callback
```

### Failure 2: "invalid_client" Error

**Error Message:**
```
Error 401: invalid_client
```

**Diagnosis:**
Your Client ID or Client Secret doesn't match what's in Google Console.

**Check:**
```bash
echo $GOOGLE_CLIENT_ID
# Should output: 153516560694-9ffsc4hfp2qbipd8bisq9rpb0uvqc2gu.apps.googleusercontent.com

# Verify this matches your Google Console OAuth Client
```

**Fix:**
1. Go to Google Console → Credentials
2. Copy the EXACT Client ID and Client Secret
3. Update your environment variables
4. Restart your server

### Failure 3: OAuth Works But Sync Fails (403 Error)

**Error Message:**
```
Error 403: Calendar API has not been used in project...
```

**Diagnosis:**
Google Calendar API is not enabled in your Google Cloud project.

**Fix:**
1. Go to: https://console.cloud.google.com/apis/library
2. Search: "Google Calendar API"
3. Click on it
4. Click **"ENABLE"**
5. Wait 30 seconds for activation
6. Try syncing again

### Failure 4: "access_denied" Error

**Error Message:**
```
Error: access_denied
```

**Diagnosis:**
User denied permissions OR app is restricted.

**For Testing:**
1. When you see "This app isn't verified"
2. Click **"Advanced"**
3. Click **"Go to SmartScheduler (unsafe)"**
4. Grant permissions

**For Production:**
Submit app for Google verification (if >100 users)

### Failure 5: Tokens Not Saved

**Symptom:**
OAuth succeeds, but refreshing the page shows "Not Connected"

**Diagnosis:**
Database write issue or session problem.

**Check:**
```sql
SELECT * FROM "calendarIntegrations" WHERE "userId" = YOUR_USER_ID;
```

**If empty:**
- Check server logs for database errors
- Verify `DATABASE_URL` is set correctly
- Ensure database connection is working

---

## Quick Test Script

I'll create an automated test script for you to run:

Save this as `test-google-oauth.sh`:

```bash
#!/bin/bash

echo "Testing Google OAuth Configuration..."
echo "====================================="
echo ""

# Test 1: Environment variables
echo "Test 1: Environment Variables"
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo "✅ PASS - OAuth credentials are set"
else
  echo "❌ FAIL - Missing OAuth credentials"
  exit 1
fi

# Test 2: Server is running
echo ""
echo "Test 2: Server Accessibility"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200\|302"; then
  echo "✅ PASS - Server is running"
else
  echo "❌ FAIL - Server is not accessible"
  exit 1
fi

# Test 3: Auth URL endpoint
echo ""
echo "Test 3: Auth URL Generation"
# Note: This requires authentication, so we'll just check the endpoint exists
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/integrations/google/auth | grep -q "401\|200"; then
  echo "✅ PASS - Auth endpoint exists"
else
  echo "❌ FAIL - Auth endpoint not found"
  exit 1
fi

echo ""
echo "====================================="
echo "Automated tests complete!"
echo ""
echo "Next: Manual test by visiting:"
echo "https://smart-scheduler.ai/integrations"
echo "and clicking 'Connect Google Calendar'"
```

---

## Test Checklist

Use this checklist when testing:

### Before Testing
- [ ] `npm run dev` is running
- [ ] No errors in server startup logs
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- [ ] `BASE_URL` is correct
- [ ] Redirect URI is configured in Google Console
- [ ] Google Calendar API is enabled

### During Testing
- [ ] Can access application homepage
- [ ] Can login successfully
- [ ] Can navigate to integrations page
- [ ] "Connect Google Calendar" button is visible
- [ ] Clicking button redirects to Google
- [ ] Can see and grant permissions
- [ ] Successfully redirected back
- [ ] Google Calendar shows as connected

### After OAuth
- [ ] Can click "Sync Calendar"
- [ ] Events appear in the application
- [ ] No console errors
- [ ] Database has integration record
- [ ] Tokens are stored in database

### Cleanup After Testing
- [ ] Can disconnect calendar
- [ ] Can reconnect successfully
- [ ] Multiple calendars can be added (if needed)

---

## Need Help?

If tests fail, run the diagnostic script:
```bash
bash scripts/verify-google-oauth.sh
```

Check the detailed setup guide:
- `GOOGLE_OAUTH_SETUP.md`

Review server logs for OAuth-specific messages:
- Look for `[OAuth:Google]` prefix
- Look for `[GoogleCalendarService]` prefix
