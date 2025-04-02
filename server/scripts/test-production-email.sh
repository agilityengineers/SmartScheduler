#!/bin/bash
# Test Production Email Setup Script for My Smart Scheduler
# Usage: ./test-production-email.sh your-email@example.com

# Set text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Show banner
echo -e "${BOLD}${BLUE}====================================================${NC}"
echo -e "${BOLD}${BLUE}    My Smart Scheduler - Production Email Tester    ${NC}"
echo -e "${BOLD}${BLUE}====================================================${NC}\n"

# Check if email argument is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No recipient email provided${NC}"
  echo -e "${YELLOW}Usage: $0 your-email@example.com${NC}"
  exit 1
fi

# Show status
echo -e "${BOLD}Checking email configuration...${NC}"

# Run the diagnostic script
node server/scripts/productionEmailDiagnostic.js "$1"

# Get the exit code from the previous command
status=$?

if [ $status -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}Email test completed!${NC}"
  echo -e "Check your email inbox for the test message."
else
  echo -e "\n${RED}${BOLD}Email test failed!${NC}"
  echo -e "${YELLOW}Please fix the issues above and try again.${NC}"
fi

# Additional instructions
echo -e "\n${BOLD}Next steps:${NC}"
echo -e "1. If the test was successful, you can deploy your application."
echo -e "2. If the test failed, review the configuration issues."
echo -e "3. Run the setup script if needed: ${BLUE}node server/scripts/setProductionEnvironment.js${NC}"
echo -e "4. Make sure all environment variables are properly set in your production environment."
echo -e "\n${BOLD}For more information, see:${NC}"
echo -e "- ${BLUE}PRODUCTION-EMAIL-SETUP.md${NC}"
echo -e "- ${BLUE}README-email-configuration.md${NC}\n"