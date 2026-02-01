#!/bin/bash

# Google OAuth Testing Script
# This script runs automated tests for your Google OAuth configuration

echo "========================================="
echo "Google OAuth Testing Suite"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
  local test_name=$1
  local test_command=$2

  echo -n "Testing: $test_name... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Test 1: Environment Variables
echo "1. Environment Variable Tests"
echo "------------------------------"
run_test "GOOGLE_CLIENT_ID is set" "[ -n \"\$GOOGLE_CLIENT_ID\" ]"
run_test "GOOGLE_CLIENT_SECRET is set" "[ -n \"\$GOOGLE_CLIENT_SECRET\" ]"
run_test "BASE_URL is set" "[ -n \"\$BASE_URL\" ]"
echo ""

# Display configuration
if [ -n "$GOOGLE_CLIENT_ID" ]; then
  echo "  Client ID: $GOOGLE_CLIENT_ID"
fi
if [ -n "$BASE_URL" ]; then
  echo "  Base URL: $BASE_URL"
  REDIRECT_URI="${BASE_URL}/api/integrations/google/callback"
  echo "  Redirect URI: $REDIRECT_URI"
elif [ -n "$REPL_SLUG" ] && [ -n "$REPL_OWNER" ]; then
  BASE_URL="https://${REPL_SLUG}.${REPL_OWNER}.replit.app"
  REDIRECT_URI="${BASE_URL}/api/integrations/google/callback"
  echo "  Base URL: $BASE_URL (Replit)"
  echo "  Redirect URI: $REDIRECT_URI"
else
  BASE_URL="http://localhost:5000"
  REDIRECT_URI="${BASE_URL}/api/integrations/google/callback"
  echo "  Base URL: $BASE_URL (localhost)"
  echo "  Redirect URI: $REDIRECT_URI"
fi
echo ""

# Test 2: Server Connectivity
echo "2. Server Connectivity Tests"
echo "-----------------------------"

# Check if server is running on port 5000
if nc -z localhost 5000 2>/dev/null; then
  echo -e "${GREEN}✅ PASS${NC} Server is running on port 5000"
  ((TESTS_PASSED++))
  SERVER_RUNNING=true
else
  echo -e "${RED}❌ FAIL${NC} Server is not running on port 5000"
  echo -e "${YELLOW}  → Run 'npm run dev' to start the server${NC}"
  ((TESTS_FAILED++))
  SERVER_RUNNING=false
fi
echo ""

# Test 3: API Endpoint Tests (only if server is running)
if [ "$SERVER_RUNNING" = true ]; then
  echo "3. API Endpoint Tests"
  echo "---------------------"

  # Test health/root endpoint
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ PASS${NC} Root endpoint accessible (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Root endpoint returned HTTP $HTTP_CODE"
    ((TESTS_FAILED++))
  fi

  # Test integrations endpoint (will return 401 without auth, which is expected)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/integrations)
  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} Integrations endpoint exists (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Integrations endpoint returned unexpected HTTP $HTTP_CODE"
    ((TESTS_FAILED++))
  fi

  # Test Google auth endpoint (will return 401 without auth, which is expected)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/integrations/google/auth)
  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} Google auth endpoint exists (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Google auth endpoint returned unexpected HTTP $HTTP_CODE"
    ((TESTS_FAILED++))
  fi

  echo ""
fi

# Test 4: OAuth URL Construction
echo "4. OAuth URL Construction Test"
echo "-------------------------------"

# Construct expected OAuth URL
EXPECTED_CLIENT_ID="$GOOGLE_CLIENT_ID"
EXPECTED_REDIRECT_URI=$(echo -n "$REDIRECT_URI" | jq -sRr @uri)

echo "Expected OAuth URL should contain:"
echo "  - client_id=$EXPECTED_CLIENT_ID"
echo "  - redirect_uri=$EXPECTED_REDIRECT_URI"
echo "  - scope=...calendar..."
echo "  - access_type=offline"
echo ""

# Test 5: Database Connection (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
  echo "5. Database Connection Test"
  echo "---------------------------"

  if command -v psql > /dev/null 2>&1; then
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ PASS${NC} Database connection successful"
      ((TESTS_PASSED++))

      # Check if calendarIntegrations table exists
      if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"calendarIntegrations\";" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC} calendarIntegrations table exists"
        ((TESTS_PASSED++))

        # Count existing Google integrations
        GOOGLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"calendarIntegrations\" WHERE type = 'google';")
        echo "  Found $GOOGLE_COUNT Google Calendar integration(s)"
      else
        echo -e "${RED}❌ FAIL${NC} calendarIntegrations table not found"
        ((TESTS_FAILED++))
      fi
    else
      echo -e "${RED}❌ FAIL${NC} Cannot connect to database"
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠ SKIP${NC} psql not installed, skipping database tests"
  fi
  echo ""
fi

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Open your browser and go to: $BASE_URL/integrations"
  echo "2. Click 'Connect Google Calendar'"
  echo "3. Grant permissions on Google's consent screen"
  echo "4. Verify you're redirected back successfully"
  echo ""
  echo "For detailed testing steps, see: TESTING_GOOGLE_OAUTH.md"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Ensure server is running: npm run dev"
  echo "2. Check environment variables are set correctly"
  echo "3. Verify Google Cloud Console configuration"
  echo "4. See GOOGLE_OAUTH_SETUP.md for detailed setup"
  echo ""
  echo "Run diagnostic script: bash scripts/verify-google-oauth.sh"
  exit 1
fi
