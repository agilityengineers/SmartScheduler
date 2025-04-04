# Session Management Configuration

This document explains how to properly configure and manage user sessions for Smart Scheduler in a production environment.

## Why Session Management Matters

The application uses session-based authentication to maintain user login state between requests. Proper session configuration is crucial for:

1. **User persistence**: Keeping users logged in between page reloads and browser restarts
2. **Security**: Preventing session hijacking and other security vulnerabilities
3. **Scalability**: Allowing multiple server instances to share session data

## Required Environment Variables

To ensure proper session management in production, set the following environment variables:

```
NODE_ENV=production
USE_POSTGRES=true
DATABASE_URL=postgres://username:password@hostname:port/database
SESSION_SECRET=<random-secure-string>
```

The `SESSION_SECRET` is particularly important - it's used to sign session cookies. If this value changes between deployments, all users will be logged out.

## Setting Up Production Environment

1. Run the setup script to generate a secure SESSION_SECRET:

```
bash ./setup-production-env.sh
```

2. Save the generated SESSION_SECRET to your environment variables or deployment configuration.

3. Ensure your production environment is using HTTPS, as session cookies are set to 'secure' in production mode.

4. Restart your application server to apply the changes.

## Verifying Your Configuration

You can verify your session configuration using:

```
bash ./check-session-config.sh
```

This will check if all required environment variables are set correctly.

## Troubleshooting

If users are being logged out unexpectedly:

1. **Check SESSION_SECRET**: Make sure it's consistent across deployments and server instances.
2. **Verify PostgreSQL Connection**: Sessions are stored in PostgreSQL; check the database connection.
3. **Check Cookie Settings**: In production, cookies require HTTPS. Ensure your site is served over HTTPS.
4. **Session Table**: Verify the 'session' table exists in your PostgreSQL database.

## Production Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Set USE_POSTGRES=true
- [ ] Configure DATABASE_URL with proper credentials
- [ ] Set a unique, random SESSION_SECRET
- [ ] Ensure HTTPS is properly configured
- [ ] Restart the application server

Following these guidelines will ensure smooth user authentication and session management in your production environment.