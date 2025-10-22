# SmartScheduler

## Overview

SmartScheduler is a full-stack scheduling and calendar application that enables users to manage events, create shareable booking links, coordinate team schedules, and integrate with external calendar services. The application supports subscription-based pricing through Stripe, email notifications, and comprehensive admin controls for user and organization management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- React Query (TanStack Query) for server state management and API caching
- Tailwind CSS with shadcn/ui component library for consistent UI design

**State Management:**
- React Query handles all server state, API calls, and caching
- React Context API manages user authentication state and tutorial/onboarding flows
- Local component state for UI-specific interactions

**Design Patterns:**
- Component-based architecture with reusable UI components in `@/components/ui`
- Feature-specific components organized by domain (booking, calendar, admin, etc.)
- Custom hooks for shared logic and API interactions
- Context providers for cross-cutting concerns (UserContext, TutorialContext)

### Backend Architecture

**Technology Stack:**
- Node.js with Express for the HTTP server
- TypeScript for type safety across the entire backend
- PostgreSQL as the primary database
- Drizzle ORM for type-safe database queries and migrations
- Session-based authentication using express-session with PostgreSQL session store

**Architecture Patterns:**
- RESTful API design with route handlers organized in `server/routes.ts`
- Storage abstraction layer (`IStorage` interface) with implementations for both PostgreSQL (`PostgresStorage`) and in-memory storage (`MemStorage`)
- Service layer pattern for business logic (calendar services, email service, reminder service, team scheduling, etc.)
- Middleware-based authentication and authorization checks

**Authentication & Authorization:**
- Session-based authentication with secure HTTP-only cookies
- Role-based access control (RBAC) with roles: admin, company_admin, team_manager, user
- Session persistence in PostgreSQL for production environments
- Password reset flow with time-limited tokens stored in database
- Email verification system for new user registrations

### Data Storage

**Database:**
- PostgreSQL as the primary relational database
- Drizzle ORM provides type-safe schema definitions and query building
- Database schema defined in `shared/schema.ts` with the following core entities:
  - Users (with roles, organizations, teams)
  - Organizations (multi-tenant support)
  - Teams (nested within organizations)
  - Events (calendar events)
  - Booking Links (shareable scheduling links)
  - Bookings (scheduled appointments)
  - Calendar Integrations (Google, Outlook, Zoom, Zapier)
  - Subscriptions (Stripe-based subscription management)
  - Settings (user preferences and availability)

**Session Storage:**
- Production: PostgreSQL-backed session store using `connect-pg-simple`
- Development: Optional in-memory session store for faster local development
- Session configuration prioritizes security with HTTP-only cookies and secure flags in production

**Migration Strategy:**
- Drizzle Kit handles schema migrations with `npm run db:push`
- Schema changes tracked in the `migrations` directory
- Automatic table creation on initialization via `initDB.ts`

### External Dependencies

**Email Services:**
- **Primary:** Google Email (Gmail) for production email delivery with higher deliverability rates
- **Fallback (Disabled):** Legacy SMTP server (currently disabled due to connectivity issues)
- **Development:** Ethereal.email for testing without actual delivery
- Nodemailer library handles all email transport
- Email template system with customizable templates stored in database (`EmailTemplateManager`)
- Verification emails, password reset emails, booking confirmations, and reminders

**Payment Processing:**
- Stripe integration for subscription management and payment processing
- Webhook handlers for Stripe events (subscription updates, payment failures)
- Support for multiple subscription tiers: Free, Individual, Team, Organization
- Price management through Stripe Products Manager admin interface
- Subscription status tracking (active, trialing, past_due, canceled, expired)

**Calendar Integrations:**
- Google Calendar API for two-way calendar sync
- Outlook/Microsoft Calendar integration
- Zoom meeting creation and validation
- Zapier webhook support for workflow automation
- iCalendar (.ics) format support for generic calendar apps
- Service abstraction through `ICalendarService` interface

**External APIs:**
- Stripe API for payment processing
- Google Calendar API (OAuth 2.0)
- Microsoft Graph API for Outlook
- Zoom API for meeting creation
- Timezone data from IANA timezone database

**Development Tools:**
- Playwright for end-to-end testing (126 tests across Chromium, Firefox, WebKit)
- GitHub Actions for CI/CD automation
- ESBuild for production server bundling
- TypeScript compiler for type checking

**Third-Party Libraries:**
- Radix UI for accessible headless UI components
- date-fns for date manipulation and formatting
- Zod for runtime validation and schema parsing
- nanoid for generating unique identifiers
- bcrypt/crypto for password hashing