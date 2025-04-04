#!/bin/bash

echo "Setting up production environment variables..."
echo ""

# Check if NODE_ENV is already set to production
if [ "$NODE_ENV" != "production" ]; then
  echo "Setting NODE_ENV=production"
  export NODE_ENV=production
else
  echo "✅ NODE_ENV already set to production"
fi

# Check if USE_POSTGRES is already set to true
if [ "$USE_POSTGRES" != "true" ]; then
  echo "Setting USE_POSTGRES=true"
  export USE_POSTGRES=true
else
  echo "✅ USE_POSTGRES already set to true"
fi

# Generate SESSION_SECRET if not set
if [ -z "$SESSION_SECRET" ]; then
  # Generate a random 32-character hex string
  GENERATED_SECRET=$(openssl rand -hex 32)
  echo "Setting SESSION_SECRET to a secure random value"
  export SESSION_SECRET=$GENERATED_SECRET
  
  echo ""
  echo "⚠️ IMPORTANT: To maintain persistent sessions, add this to your environment:"
  echo "SESSION_SECRET=$GENERATED_SECRET"
else
  echo "✅ SESSION_SECRET is already set"
fi

# Check database configuration
if [ -z "$DATABASE_URL" ] && ([ -z "$PGHOST" ] || [ -z "$PGPORT" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]); then
  echo "⚠️ WARNING: Database environment variables are not properly set"
  echo "Please set either DATABASE_URL or all of PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE"
else
  echo "✅ Database environment variables are set"
fi

echo ""
echo "Environment setup complete. Current configuration:"
echo "NODE_ENV=$NODE_ENV"
echo "USE_POSTGRES=$USE_POSTGRES"
echo "SESSION_SECRET=[HIDDEN FOR SECURITY]"
echo "DATABASE_URL=[HIDDEN FOR SECURITY]"

echo ""
echo "To apply these changes, restart your production environment."
echo ""
echo "To verify your production configuration, run:"
echo "./check-production-env.sh"
echo "./check-session-config.sh"