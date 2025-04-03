#!/bin/bash
# Full Email Diagnostic Suite
# This script runs a comprehensive suite of tests to diagnose email issues

# Text formatting
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Print header
echo -e "${BOLD}=====================================================${RESET}"
echo -e "${BOLD}     SMART SCHEDULER EMAIL DIAGNOSTIC SUITE          ${RESET}"
echo -e "${BOLD}=====================================================${RESET}"
echo ""

# Function to print section headers
section() {
  echo ""
  echo -e "${BLUE}${BOLD}$1${RESET}"
  echo -e "${BLUE}${BOLD}$(printf '=%.0s' $(seq 1 ${#1}))${RESET}"
}

# Check for password argument
if [ -z "$1" ]; then
  echo -e "${YELLOW}Warning: No SMTP password provided. Some tests may fail.${RESET}"
  echo -e "${YELLOW}Usage: $0 <smtp_password> [test_email]${RESET}"
  SMTP_PASS=""
else
  SMTP_PASS="$1"
fi

# Check for email argument
if [ -z "$2" ]; then
  TEST_EMAIL="test@example.com"
else
  TEST_EMAIL="$2"
fi

# Print environment info
section "ENVIRONMENT INFORMATION"
echo "Date: $(date)"
echo "Node version: $(node -v)"
echo "Environment: ${NODE_ENV:-development}"
echo "Test email: $TEST_EMAIL"
echo "SMTP password: ${SMTP_PASS:+[Provided]}"

# Step 1: Test SMTP Environment Variables
section "CHECKING ENVIRONMENT VARIABLES"
env | grep -E 'SMTP_|FROM_EMAIL' | sed 's/=.*$/=[HIDDEN]/'

# Step 2: Test Basic SMTP Connectivity
section "TESTING SMTP CONNECTIVITY"
echo "Testing connection to SMTP server..."
node server/scripts/testSmtp.js

# Step 3: Run the configuration diagnostic
section "RUNNING SMTP CONFIGURATION DIAGNOSTIC"
node server/scripts/smtpConfigCheck.js

# Step 4: Test Production Environment
section "SIMULATING PRODUCTION ENVIRONMENT"
echo "This test simulates a production environment with hardcoded values..."
node server/scripts/test-production-email.cjs "$SMTP_PASS" "$TEST_EMAIL"

# Step 5: Test basic email delivery
section "TESTING BASIC EMAIL DELIVERY"
echo "Attempting to send a test email..."
node server/scripts/testEmail.js "$TEST_EMAIL"

# Step 6: Test email verification
section "TESTING EMAIL VERIFICATION FLOW"
echo "Generating test verification link..."
node server/scripts/generateVerificationLink.js

# Final summary
section "DIAGNOSTIC SUMMARY"
echo "The diagnostic suite has completed."
echo ""
echo -e "${BOLD}Recommendations:${RESET}"
echo "1. Check for any errors in the tests above"
echo "2. Ensure all environment variables are correctly set"
echo "3. Verify SMTP credentials are correct"
echo "4. Make sure FROM_EMAIL is properly formatted (username@domain.com)"
echo ""
echo -e "${BOLD}If deploying to production:${RESET}"
echo "1. Set all email environment variables in your hosting platform"
echo "2. Run the production test script after deployment"
echo "3. Test the verification flow with a real email address"
echo ""
echo -e "${GREEN}${BOLD}Diagnostic complete!${RESET}"