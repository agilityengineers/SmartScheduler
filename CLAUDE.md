# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Replit Environment Warning

**DO NOT modify Replit configuration files:** `.replit`, `replit.nix`, or `.config/` directory.

## Project Overview

SmartScheduler is a full-stack scheduling/calendar application with React frontend and Express backend, using PostgreSQL/Drizzle ORM. Features: calendar integrations (Google, Outlook, iCal), booking links with team scheduling, Stripe subscriptions, and role-based access control.

## Commands

```bash
npm run dev              # Start development server (tsx watches server/index.ts)
npm run db:push          # Push schema changes to database (drizzle-kit)
npm run build            # Build client (Vite) and server (esbuild)
npm run check            # TypeScript type checking
npm start                # Run production build (requires DATABASE_URL)

# E2E Tests (Playwright) - not available in Replit, use GitHub Actions or run locally
npm test                 # Run all tests (126 tests × 3 browsers)
npm run test:chromium    # Single browser
npm run test:ui          # Interactive UI mode
npm run test:debug       # Debug mode
npx playwright test -g "test name"  # Run specific test

# Unit tests
tsx server/tests/<test-file>.ts
```

## Architecture

```
/client/src/              - React frontend (Vite + TypeScript)
  ├── pages/              - Page components
  ├── components/         - Reusable components by feature
  ├── hooks/              - Custom hooks (useEvents, useCalendarIntegration)
  ├── context/            - React contexts (UserContext, TutorialContext)
  └── lib/                - Utilities (queryClient, calendar-utils)

/server/                  - Express backend
  ├── index.ts            - Entry point, session/database setup
  ├── routes.ts           - Main routes file (~8000 lines, monolithic)
  ├── routes/             - Modular route files (bookingPaths, stripe)
  ├── storage.ts          - Storage interface (IStorage)
  ├── postgresStorage.ts  - PostgreSQL implementation
  ├── memStorage.ts       - In-memory dev implementation
  ├── calendarServices/   - Google/Outlook calendar integration classes
  └── utils/              - Business logic (email, scheduling, auth)

/shared/schema.ts         - Drizzle ORM schema definitions
/e2e/                     - Playwright E2E tests (see e2e/README.md)
```

## Key Patterns

**Authentication:** Session-based (not JWT). User ID in `req.session.userId`. Roles: `ADMIN`, `COMPANY_ADMIN`, `TEAM_MANAGER`, `USER`. Middleware: `adminOnly`, `adminAndCompanyAdmin`, `managerAndAbove`.

**Database Access:** Always use `storage` interface, never directly access PostgresStorage/MemStorage. Switch controlled by `USE_POSTGRES=true` or `NODE_ENV=production`.

**Client-Server:** All API requests use `credentials: "include"`. Native `fetch` API (not axios). TanStack React Query for server state.

**Calendar Services:** Each provider implements `initialize()`, `isAuthenticated()`, `syncEvents()`. Token refresh is automatic.

**Email:** SendGrid-only (no SMTP fallback). Templates stored in database with versioning. Variables use `{{variableName}}` syntax.

## Important Notes

1. **Dates:** Always timezone-aware. Server stores UTC, client displays in user timezone. Use `date-fns` and `date-fns-tz`.

2. **New Routes:** Add to `server/routes/` directory, not the monolithic `routes.ts`. Existing modular routes:
   - `bookingPaths.ts` - Public booking link routes
   - `stripe.ts` - Subscription and payment routes
   - `stripeProductsManager.ts` - Stripe product/price management
   - `smartSchedulerWebhook.ts` - External webhook integrations

3. **Booking Validation:** Enforces lead time, buffer times, per-day limits, timezone conversion.

4. **OAuth Callbacks:**
   - Google: `{BASE_URL}/api/integrations/google/callback`
   - Outlook: `{BASE_URL}/api/integrations/outlook/callback`

5. **Stripe:** Gracefully disabled if `STRIPE_SECRET_KEY` not set. 14-day trial period.

6. **Workflows:** Automation system with triggers (booking created, event reminder, etc.) and actions (send email, webhook, SMS). See `WorkflowTriggerType` and `WorkflowActionType` in schema.

## Environment Variables

**Required:** `DATABASE_URL`, `SESSION_SECRET`

**Email:** `SENDGRID_API_KEY`, `FROM_EMAIL`

**OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `BASE_URL`

**Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Dev:** `USE_POSTGRES=true` to force PostgreSQL in development

## Key Files

- `server/routes.ts:67-108` - Auth middleware (`authMiddleware`)
- `server/routes.ts:110-127` - Role-based middleware (`roleCheck`, `adminOnly`, etc.)
- `shared/schema.ts` - Database schema with all Drizzle table definitions
- `client/src/context/UserContext.tsx` - Client auth state
- `server/utils/teamSchedulingService.ts` - Team availability calculations
- `server/utils/emailService.ts` - SendGrid integration
- `server/utils/emailTemplateManager.ts` - Email template CRUD with versioning

## Diagnostic Commands

```bash
tsx server/utils/testSendGridConnectivity.ts    # Test SendGrid API
tsx server/scripts/checkDatabaseConnection.ts    # Test PostgreSQL connection
tsx server/scripts/checkDatabaseEnv.ts           # Verify DATABASE_URL format
node server/scripts/testEnvironmentVars.js       # Check all env vars
```
