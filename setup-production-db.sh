#!/bin/bash

# Check if NODE_ENV is production
if [ "$NODE_ENV" != "production" ]; then
  echo "WARNING: NODE_ENV is not set to 'production'"
  echo "This script should only be run in a production environment"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ] && ([ -z "$PGHOST" ] || [ -z "$PGPORT" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]); then
  echo "ERROR: Missing required database environment variables"
  echo "Please set either DATABASE_URL or all of PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE"
  exit 1
fi

# Set USE_POSTGRES to true if not already set
if [ -z "$USE_POSTGRES" ]; then
  export USE_POSTGRES=true
  echo "Setting USE_POSTGRES=true for database connection"
fi

# Run the script
echo "Running database setup script..."
npx tsx server/scripts/setupProductionDatabase.ts

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Production database setup complete"
  echo ""
  echo "You can now log in to the application with:"
  echo "- Username: admin"
  echo "- Password: adminpass"
else
  echo ""
  echo "❌ An error occurred during database setup"
  echo "Check the output above for details"
fi