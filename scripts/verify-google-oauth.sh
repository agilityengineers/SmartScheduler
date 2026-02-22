#!/bin/bash

# Google OAuth Configuration Verification Script
# This script checks if your Google OAuth configuration is correct

echo "========================================="
echo "Google OAuth Configuration Verification"
echo "========================================="
echo ""

# Function to check if a variable is set
check_var() {
  local var_name=$1
  local var_value=${!var_name}

  if [ -n "$var_value" ]; then
    echo "✅ $var_name is set"
    if [ "$var_name" == "GOOGLE_CLIENT_SECRET" ]; then
      echo "   Value: (hidden for security)"
    else
      echo "   Value: $var_value"
    fi
    return 0
  else
    echo "❌ $var_name is NOT set"
    return 1
  fi
}

# Check environment variables
echo "1. Checking Environment Variables"
echo "-----------------------------------"
check_var "GOOGLE_CLIENT_ID"
check_var "GOOGLE_CLIENT_SECRET"
check_var "BASE_URL"
echo ""

# Determine the redirect URI
echo "2. Determining Redirect URI"
echo "-----------------------------------"
if [ -n "$BASE_URL" ]; then
  REDIRECT_URI="${BASE_URL}/api/integrations/google/callback"
  echo "Using BASE_URL: $BASE_URL"
elif [ -n "$REPL_SLUG" ] && [ -n "$REPL_OWNER" ]; then
  REDIRECT_URI="https://${REPL_SLUG}.${REPL_OWNER}.replit.app/api/integrations/google/callback"
  echo "Using Replit URL: https://${REPL_SLUG}.${REPL_OWNER}.replit.app"
else
  REDIRECT_URI="http://localhost:5000/api/integrations/google/callback"
  echo "Using localhost: http://localhost:5000"
fi

echo "✅ Redirect URI: $REDIRECT_URI"
echo ""

# Check OAuth scopes
echo "3. OAuth Scopes Configuration"
echo "-----------------------------------"
echo "Your app requests these scopes:"
echo "  - https://www.googleapis.com/auth/calendar"
echo "  - https://www.googleapis.com/auth/calendar.events"
echo "  - profile"
echo "  - email"
echo ""

# Verification checklist
echo "4. Verification Checklist"
echo "-----------------------------------"
echo "In Google Cloud Console (console.cloud.google.com), verify:"
echo ""
echo "[ ] OAuth consent screen is configured"
echo "[ ] Scopes are added in consent screen:"
echo "    - https://www.googleapis.com/auth/calendar"
echo "    - https://www.googleapis.com/auth/calendar.events"
echo "    - profile"
echo "    - email"
echo "[ ] OAuth 2.0 Client ID created"
echo "[ ] Authorized redirect URI is EXACTLY:"
echo "    $REDIRECT_URI"
echo "[ ] Google Calendar API is ENABLED"
echo "[ ] Client ID matches: $GOOGLE_CLIENT_ID"
echo ""

# Common issues
echo "5. Common Issues & Solutions"
echo "-----------------------------------"
echo "❌ redirect_uri_mismatch error:"
echo "   → Verify redirect URI in Google Console matches exactly"
echo "   → No trailing slashes, correct protocol (https/http)"
echo ""
echo "❌ invalid_client error:"
echo "   → Client ID or Secret doesn't match"
echo "   → Regenerate credentials in Google Console"
echo ""
echo "❌ access_denied error:"
echo "   → User denied permissions"
echo "   → For testing: Click 'Advanced' then 'Go to [App] (unsafe)'"
echo ""
echo "❌ 403 Forbidden when syncing calendar:"
echo "   → Google Calendar API not enabled"
echo "   → Go to: console.cloud.google.com/apis/library"
echo "   → Search: 'Google Calendar API'"
echo "   → Click ENABLE"
echo ""

# Next steps
echo "6. Next Steps"
echo "-----------------------------------"
echo "1. Verify all checklist items in Google Cloud Console"
echo "2. Test OAuth flow: https://smart-scheduler.ai/integrations"
echo "3. Check server logs for OAuth debug messages"
echo "4. See GOOGLE_OAUTH_SETUP.md for detailed setup guide"
echo ""

echo "========================================="
echo "Configuration check complete!"
echo "========================================="
