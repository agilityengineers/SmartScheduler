#!/bin/bash

echo "Checking session configuration for production deployment..."
echo ""

# Check SESSION_SECRET
if [ -n "$SESSION_SECRET" ]; then
  echo "✅ SESSION_SECRET is set (value hidden for security)"
else
  echo "❌ SESSION_SECRET is not set"
  echo "   Set a strong, random SESSION_SECRET for secure and persistent sessions"
  echo "   Example: SESSION_SECRET=$(openssl rand -hex 32)"
fi

# Check cookie secure setting is appropriate
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ Cookies will be set with secure flag in production mode"
else
  echo "⚠️ NODE_ENV is not production, cookies will not have secure flag"
  echo "   For production deployments, set NODE_ENV=production"
fi

# Check for TLS/HTTPS
echo ""
echo "Important Session Security Notes:"
echo "- Make sure your production server uses HTTPS for secure cookie transmission"
echo "- Session data is stored in the PostgreSQL database in the 'session' table"
echo "- Using different SESSION_SECRET values across deployments will invalidate existing sessions"

# Recommend settings
echo ""
echo "Recommended Production Environment Settings:"
echo "NODE_ENV=production"
echo "USE_POSTGRES=true"
echo "SESSION_SECRET=[a-strong-random-value]"
echo "DATABASE_URL=[your-postgresql-connection-string]"