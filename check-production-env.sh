#!/bin/bash

echo "Checking environment variables for production deployment..."
echo ""

# Check NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ NODE_ENV is set to production"
else
  echo "❌ NODE_ENV is not set to production (current value: $NODE_ENV)"
  echo "   Set NODE_ENV=production for a production deployment"
fi

# Check USE_POSTGRES
if [ "$USE_POSTGRES" = "true" ]; then
  echo "✅ USE_POSTGRES is set to true"
else
  echo "❌ USE_POSTGRES is not set to true (current value: $USE_POSTGRES)"
  echo "   Set USE_POSTGRES=true for database functionality"
fi

# Check DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  # Display a masked version of the URL
  masked_url=$(echo $DATABASE_URL | sed -E 's/(:.*@)/:****@/')
  echo "✅ DATABASE_URL is set: $masked_url"
else
  echo "❌ DATABASE_URL is not set"
  
  # Check individual PostgreSQL variables as a fallback
  pg_vars_ok=true
  missing_vars=()
  
  if [ -z "$PGHOST" ]; then
    pg_vars_ok=false
    missing_vars+=("PGHOST")
  fi
  
  if [ -z "$PGPORT" ]; then
    pg_vars_ok=false
    missing_vars+=("PGPORT")
  fi
  
  if [ -z "$PGUSER" ]; then
    pg_vars_ok=false
    missing_vars+=("PGUSER")
  fi
  
  if [ -z "$PGPASSWORD" ]; then
    pg_vars_ok=false
    missing_vars+=("PGPASSWORD")
  fi
  
  if [ -z "$PGDATABASE" ]; then
    pg_vars_ok=false
    missing_vars+=("PGDATABASE")
  fi
  
  if [ "$pg_vars_ok" = true ]; then
    echo "✅ Individual PostgreSQL variables are set (PGHOST, PGUSER, etc.)"
    echo "   Host: $PGHOST"
    echo "   Port: $PGPORT"
    echo "   Database: $PGDATABASE"
    echo "   User: $PGUSER"
    echo "   Password: [HIDDEN]"
  else
    echo "❌ Missing PostgreSQL variables: ${missing_vars[*]}"
    echo "   Either set DATABASE_URL or set all the individual PG* variables"
  fi
fi

echo ""
echo "Database Connection Check:"
echo "Running database connectivity test..."
npx tsx server/scripts/checkDatabaseConnection.ts