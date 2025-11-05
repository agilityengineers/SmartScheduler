# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ IMPORTANT: Replit Development Environment

**DO NOT modify any Replit configuration files or development server settings.** This project is configured to run on Replit's development environment and these configurations must remain intact.

**Protected Replit Configuration Files:**
- `.replit` - Replit run configuration
- `replit.nix` - Nix package dependencies
- Any files in `.config/` directory related to Replit

When making changes to this project, preserve all Replit-specific settings and environment configurations.

## Project Overview

SmartScheduler is a full-stack scheduling/calendar application built with React (client) and Express (server), using PostgreSQL for data persistence and Drizzle ORM. It supports calendar integrations (Google, Outlook, iCal), booking links with team scheduling, Stripe-based subscriptions, and role-based access control for organizations.

## Common Development Commands

### Development
```bash
npm run dev              # Start development server (tsx watches server/index.ts)
```

### Database
```bash
npm run db:push          # Push schema changes to database using drizzle-kit
```

### Build & Production
```bash
npm run build            # Build both client (Vite) and server (esbuild)
npm run check            # TypeScript type checking
npm start                # Run production build (requires DATABASE_URL)
```

### Running Tests

#### End-to-End Tests (Playwright)
The project has comprehensive E2E tests covering all major features:
```bash
npm test                 # Run all E2E tests (126 tests across 3 browsers)
npm run test:chromium    # Run tests in Chromium only
npm run test:firefox     # Run tests in Firefox only
npm run test:webkit      # Run tests in WebKit only
npm run test:ui          # Open Playwright UI for interactive testing
npm run test:debug       # Run tests in debug mode
npm run test:report      # View last test report
```

**Note:** E2E tests require browser dependencies that are not available in Replit. Run tests locally or use GitHub Actions (configured automatically).

**Test Coverage:**
- Authentication (login, register, logout, session persistence)
- Calendar & Events (create, edit, delete, navigation)
- Booking Links (create, manage, public booking flow)
- Settings (profile, timezone, working hours, integrations)

See `/e2e/README.md` for detailed documentation.

#### Unit Tests
Individual test files exist in `server/tests/` and can be run directly:
```bash
tsx server/tests/<test-file>.ts
```

## Architecture Overview

### Project Structure

```
/client/src/           - React frontend (Vite + TypeScript)
  ├── pages/          - Page components (Home, BookingLinks, Settings, etc.)
  ├── components/     - Reusable components organized by feature
  ├── hooks/          - Custom React hooks (useEvents, useCalendarIntegration, etc.)
  ├── context/        - React contexts (UserContext, TutorialContext)
  └── lib/            - Utilities (queryClient, calendar-utils)

/server/              - Express backend (Node.js + TypeScript)
  ├── index.ts        - Entry point, session/database setup
  ├── routes.ts       - Main monolithic routes file (~7500 lines)
  ├── routes/         - Modular route files (bookingPaths, stripe)
  ├── storage.ts      - Storage interface abstraction
  ├── postgresStorage.ts - PostgreSQL implementation
  ├── memStorage.ts   - In-memory dev implementation
  ├── calendarServices/ - Calendar integration classes
  ├── utils/          - Business logic (email, scheduling, auth)
  └── services/       - External services (Stripe)

/shared/              - Code shared between client/server
  └── schema.ts       - Drizzle ORM schema definitions

/migrations/          - Database migration files (Drizzle)

/e2e/                 - End-to-end tests (Playwright)
  ├── auth.spec.ts          - Authentication tests
  ├── calendar.spec.ts      - Calendar and events tests
  ├── booking-links.spec.ts - Booking links tests
  ├── settings.spec.ts      - Settings and preferences tests
  └── helpers/              - Test utilities and helpers

/.github/workflows/   - GitHub Actions CI/CD
  ├── playwright.yml           - Main test workflow (runs on push/PR)
  └── playwright-scheduled.yml - Scheduled nightly tests
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Routing: wouter (lightweight React router)
- State Management: @tanstack/react-query v5 (server state)
- UI: shadcn/ui (Radix UI primitives + Tailwind CSS)
- Forms: react-hook-form + Zod validation
- Date/Time: date-fns, react-datepicker

**Backend:**
- Express 4 + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Session: express-session with connect-pg-simple (PostgreSQL store)
- Auth: Custom session-based auth (req.session.userId)
- Email: SendGrid API with template management
- Payment: Stripe API

**External Integrations:**
- Google Calendar (OAuth2)
- Microsoft Outlook Calendar (OAuth2)
- iCal/ICS URL subscriptions
- Zapier webhooks
- Zoom (video meeting links)

**Testing & CI/CD:**
- Playwright - End-to-end testing framework
- GitHub Actions - Automated CI/CD pipelines
- Test coverage: Authentication, Calendar, Bookings, Settings
- 126 tests across Chromium, Firefox, and WebKit

### Key Architectural Patterns

**Routing:**
- Server: Single monolithic `routes.ts` with all API endpoints + modular routes in `/routes`
- Client: wouter with route definitions in `App.tsx`
- Public booking links support flexible URL patterns: `/:userPath/booking/:slug`

**Authentication:**
- Session-based authentication (not JWT)
- User ID stored in `req.session.userId`
- Middleware chain: auth → role check → route handler
- Roles: `ADMIN`, `COMPANY_ADMIN`, `TEAM_MANAGER`, `USER`
- Role middleware: `adminOnly`, `adminAndCompanyAdmin`, `managerAndAbove`

**Database Access:**
- Dual storage implementation via interface (`IStorage`)
- Production: `PostgresStorage` (Drizzle ORM)
- Development: `MemStorage` (in-memory Maps)
- Selection based on `USE_POSTGRES=true` or `NODE_ENV=production`

**Calendar Sync:**
- Each provider has a service class implementing: `initialize()`, `isAuthenticated()`, `syncEvents()`
- Token refresh handled automatically on expiry
- Sync endpoint: `/api/sync` with `calendarType` and optional `integrationId`

**Team Scheduling:**
- Round-robin assignment for team bookings
- `teamSchedulingService` finds common availability across team members
- Syncs all team member calendars before calculating free slots

**Email System:**
- `EmailService` class with SendGrid API integration (SendGrid-only, no SMTP fallback)
- Template manager supports versioning and variable injection (Handlebars-like)
- Templates stored in database with 10-version history
- SendGrid configuration required for all email functionality

**Stripe Integration:**
- Subscription plans: `FREE`, `INDIVIDUAL`, `TEAM`, `ORGANIZATION`
- 14-day trial period on signup
- Webhook handling for subscription events at `/api/webhooks/stripe`

### Important Data Flow Patterns

**User Registration:**
1. Validate username/email uniqueness
2. Hash password before storage
3. Create Stripe customer and subscription (if company)
4. Send email verification link
5. Store session automatically

**Booking Flow:**
1. Client requests availability via `/api/public/booking/:slug/availability`
2. Server syncs external calendars and calculates free slots
3. Client submits booking via POST `/api/public/booking/:slug`
4. Server validates lead time, duration, conflicts, per-day limits
5. Creates Event record and sends confirmation emails

**Calendar Sync:**
1. User clicks sync in UI
2. Client calls `/api/sync` with calendar type
3. Server initializes calendar service
4. Service refreshes token if expired
5. Fetches events from external calendar
6. Stores/updates events in database with `externalId`

### Environment Variables

**Required for Production:**
- `DATABASE_URL` - PostgreSQL connection string (required for production)
- `SESSION_SECRET` - Secure random string for session encryption

**Email Configuration (SendGrid):**
- `SENDGRID_API_KEY` - SendGrid API key for email delivery (required)
- `FROM_EMAIL` - Sender email address (e.g., noreply@smart-scheduler.ai)

**OAuth Integration:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET` - Microsoft OAuth credentials
- `BASE_URL` - Custom domain URL (optional, defaults to Replit URL)

**Stripe (Optional):**
- `STRIPE_SECRET_KEY` or `STRIPESECRETKEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification

**Other:**
- `USE_POSTGRES=true` - Force PostgreSQL usage in development
- `NODE_ENV=production` - Enable production mode

### Database Schema (Key Tables)

**users** - User accounts with roles, timezone, organization/team membership
**organizations** - Top-level entities with Stripe billing
**teams** - Sub-entities within organizations
**events** - Calendar events (internal + synced from external calendars)
**bookingLinks** - Configurable booking URLs with availability rules
**bookings** - Appointments made through booking links
**calendarIntegrations** - OAuth tokens and metadata for external calendars
**settings** - User preferences (working hours, reminders, default calendar)
**subscriptions** - Stripe subscription data
**paymentMethods** - Stripe payment methods
**invoices** - Stripe invoice records
**passwordResetTokens** - Password reset workflow

All tables defined in `/shared/schema.ts` using Drizzle ORM.

### Key Files to Understand

**Core Application:**
- `server/index.ts` - Application entry point, session/database initialization
- `server/routes.ts` - All API endpoints (~7500 lines, monolithic)
- `client/src/App.tsx` - Client routing and layout structure

**Authentication & Authorization:**
- `server/routes.ts` lines 59-100 - Auth middleware implementation
- `client/src/context/UserContext.tsx` - Client-side auth state management

**Database Layer:**
- `shared/schema.ts` - Complete database schema
- `server/storage.ts` - Storage interface definition
- `server/postgresStorage.ts` - PostgreSQL implementation
- `server/db.ts` - Database connection pool

**Calendar Integration:**
- `server/calendarServices/googleCalendar.ts` - Google Calendar OAuth + sync
- `server/calendarServices/outlookCalendar.ts` - Outlook Calendar OAuth + sync
- `server/utils/oauthUtils.ts` - OAuth flow utilities

**Booking System:**
- `server/routes/bookingPaths.ts` - Flexible URL path routing
- `server/utils/teamSchedulingService.ts` - Team availability calculation
- `server/utils/pathUtils.ts` - URL slug generation with collision detection
- `client/src/pages/BookingLinks.tsx` - Booking link management UI

**Email System:**
- `server/utils/emailService.ts` - SendGrid email service integration
- `server/utils/sendGridService.ts` - SendGrid API wrapper
- `server/utils/emailTemplateManager.ts` - Template CRUD with versioning

**State Management:**
- `client/src/lib/queryClient.ts` - React Query configuration
- `client/src/hooks/useEvents.ts` - Event management hooks
- `client/src/hooks/useCalendarIntegration.ts` - Calendar integration hooks

### Code Style Notes

- **TypeScript**: Strict mode enabled, all files should be typed
- **Imports**: ES modules (`import/export`), not CommonJS
- **Async/Await**: Preferred over promises with `.then()`
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Logging**: Console logs used throughout for debugging (especially OAuth flows)
- **Forms**: react-hook-form + Zod validation schemas
- **Styling**: Tailwind CSS utility classes, use `cn()` helper for conditional classes
- **Components**: Functional components with hooks, avoid class components

### Common Pitfalls & Important Notes

1. **Date Handling**: Always be timezone-aware. Use `date-fns` and `date-fns-tz` for conversions.
   - Server stores dates in UTC
   - Client displays in user's preferred timezone
   - Bookings must account for timezone offsets

2. **Session Management**:
   - Sessions stored in PostgreSQL in production (`connect-pg-simple`)
   - Memory store in development (non-persistent)
   - `secure: false` in cookie config for development (no HTTPS required)

3. **Storage Abstraction**:
   - Always use `storage` interface, never directly access PostgresStorage/MemStorage
   - Switch controlled by `USE_POSTGRES` env var or `NODE_ENV`

4. **Calendar Sync**:
   - Token refresh is automatic in calendar service classes
   - Always check `isAuthenticated()` before calling external APIs
   - `externalId` field links events to external calendar entries

5. **Booking Validation**:
   - Lead time enforcement (minimum notice required)
   - Buffer times before/after meetings
   - Per-day booking limits
   - Timezone conversion between booker and bookee

6. **Route File Organization**:
   - Main routes in monolithic `routes.ts` (legacy)
   - New modular routes go in `server/routes/` directory
   - Use `registerRoutes()` pattern to mount routes on app

7. **Email Templates**:
   - Templates stored in database, not filesystem
   - Version history maintained (10 versions)
   - Variables use `{{variableName}}` syntax
   - Template types: `PASSWORD_RESET`, `EMAIL_VERIFICATION`, `BOOKING_CONFIRMATION`, etc.

8. **Stripe Integration**:
   - Gracefully disabled if `STRIPE_SECRET_KEY` not set
   - Webhooks require `STRIPE_WEBHOOK_SECRET` for signature verification
   - Trial period: 14 days (no payment required)

9. **Path Generation** (`pathUtils.ts`):
   - Auto-generates URL-safe slugs from names
   - Detects and resolves path collisions
   - Supports user, team, and organization paths

10. **Role-Based Access**:
    - Check `req.userRole` in middleware, not just existence of `req.userId`
    - Use role middleware chains for cleaner code
    - Client-side role checks in `UserContext` (isAdmin, isCompanyAdmin, etc.)

### Useful Diagnostic Commands

```bash
# Test SendGrid connectivity
tsx server/utils/testSendGridConnectivity.ts

# Test database connection
tsx server/scripts/checkDatabaseConnection.ts

# Check environment variables
node server/scripts/testEnvironmentVars.js
```

### OAuth Redirect URIs

When configuring OAuth apps, use these redirect URIs:

**Google Calendar:**
- `{BASE_URL}/api/integrations/google/callback`

**Outlook Calendar:**
- `{BASE_URL}/api/integrations/outlook/callback`

Replace `{BASE_URL}` with your application URL (Replit URL or custom domain).

### API Endpoint Patterns

**Authentication:**
- POST `/api/register` - Create account
- POST `/api/login` - Login (sets session)
- POST `/api/logout` - Logout (destroys session)
- GET `/api/user` - Get current user

**Events:**
- GET `/api/events` - List user's events (query params: `start`, `end`)
- POST `/api/events` - Create event
- PATCH `/api/events/:id` - Update event
- DELETE `/api/events/:id` - Delete event
- POST `/api/sync` - Sync external calendar (body: `calendarType`, `integrationId`)

**Booking Links:**
- GET `/api/booking` - List user's booking links
- POST `/api/booking` - Create booking link
- PATCH `/api/booking/:id` - Update booking link
- DELETE `/api/booking/:id` - Delete booking link
- GET `/api/public/booking/:slug/availability` - Get available slots (query: `date`)
- POST `/api/public/booking/:slug` - Create booking (body: `name`, `email`, `startTime`, `notes`)

**Integrations:**
- GET `/api/integrations` - List calendar integrations
- GET `/api/integrations/:type/connect` - Initiate OAuth flow
- GET `/api/integrations/:type/callback` - OAuth callback handler
- DELETE `/api/integrations/:id` - Remove integration

**Settings:**
- GET `/api/settings` - Get user settings
- PATCH `/api/settings` - Update settings

**Admin:**
- GET `/api/admin/users` - List all users (admin only)
- GET `/api/admin/organizations` - List organizations (admin only)
- POST `/api/admin/subscriptions` - Manage subscriptions (admin only)

### Team Scheduling Configuration

Team booking links support multiple assignment methods:

- **round-robin**: Automatically rotate through team members
- **pooled**: Bookers choose from available team members
- **specific**: Assign to specific team member(s)

Configuration stored in `bookingLinks.assignmentMethod` and `bookingLinks.teamMemberIds`.

## Testing & Quality Assurance

### End-to-End Testing (Playwright)

The project includes comprehensive E2E tests covering all major user flows:

**Test Files:**
- `e2e/auth.spec.ts` - Authentication flows (9 tests)
- `e2e/calendar.spec.ts` - Calendar and events (8 tests)
- `e2e/booking-links.spec.ts` - Booking links management (11 tests)
- `e2e/settings.spec.ts` - User settings and preferences (14 tests)

**Total Coverage:** 126 tests (42 tests × 3 browsers)

**Running Tests Locally:**
```bash
npm test                 # Run all tests
npm run test:ui          # Interactive UI mode
npm run test:chromium    # Single browser
npm run test:report      # View last report
```

**Note:** E2E tests require system browser dependencies not available in Replit. Use GitHub Actions (automated) or run locally.

### GitHub Actions CI/CD

The project is configured with automated testing workflows:

**Continuous Integration (`.github/workflows/playwright.yml`):**
- Triggers: Push to `main`/`develop`, Pull Requests
- Runs all 126 tests across 3 browsers
- Uses PostgreSQL service container
- Uploads test reports (30-day retention)
- Posts test results as PR comments
- Enforces test passage before merging

**Scheduled Tests (`.github/workflows/playwright-scheduled.yml`):**
- Runs nightly at 2 AM UTC
- Can be triggered manually
- Option to test specific browser
- Sends failure notifications

**Setting Up GitHub Actions:**
1. Push code to GitHub repository
2. GitHub Actions automatically enabled
3. Tests run on every push/PR
4. View results in "Actions" tab
5. Download HTML reports from artifacts

See `GITHUB_SETUP.md` for detailed setup instructions.

### Test Coverage

**What's Tested:**
- ✅ User registration with validation
- ✅ Login/logout with session management
- ✅ Event CRUD operations
- ✅ Calendar navigation and views
- ✅ Booking link creation and management
- ✅ Public booking flow (guest users)
- ✅ User settings and preferences
- ✅ Form validation and error handling

**Test Helpers:**
- `e2e/helpers/auth.ts` - Authentication utilities
- `e2e/helpers/utils.ts` - Common test functions
- Automatic test data generation
- API call waiting utilities

### Writing New Tests

When adding new features, add corresponding tests:

```typescript
// e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('New Feature', () => {
  test('should work correctly', async ({ page }) => {
    await registerUser(page);
    await page.goto('/new-feature');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

**Best Practices:**
- Use semantic selectors (`getByRole`, `getByLabel`)
- Keep tests independent
- Use helper functions
- Wait for API calls before assertions
- Generate unique test data
