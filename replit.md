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
- **Primary:** SendGrid for transactional email delivery (SENDGRID_API_KEY configured)
- **Sender Address:** noreply@smart-scheduler.ai
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
- Zoom meeting creation and validation (OAuth 2.0 user-level flow)
- Zapier webhook support for workflow automation
- iCalendar (.ics) format support for generic calendar apps
- Service abstraction through `ICalendarService` interface

**Zoom OAuth:**
- Zoom integration uses OAuth 2.0 with smart-scheduler.ai domain
- Credentials: ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
- Configuration in `server/utils/oauthUtils.ts`

**External APIs:**
- Stripe API for payment processing
- Google Calendar API (OAuth 2.0)
- Microsoft Graph API for Outlook
- Zoom API (OAuth 2.0, multi-domain support)
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
- Twilio for SMS notifications in workflow automation

### Workflow Automation System

**Overview:**
A comprehensive workflow automation engine that enables users to create event-driven automations with a visual builder interface. Supports complex conditional logic, multiple action types, and real-time analytics.

**Trigger Types:**
- `booking_created` - Fires when a new booking is made
- `booking_updated` - Fires when a booking is modified
- `booking_canceled` - Fires when a booking is canceled
- `event_reminder` - Scheduled reminder before events
- `follow_up` - Post-event follow-up actions
- `team_schedule_change` - Team availability changes
- `manual` - User-initiated workflow triggers

**Action Types:**
- `send_email` - Send templated emails with variable substitution
- `send_sms` - Send SMS via Twilio (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- `trigger_webhook` - HTTP POST to external services
- `trigger_zapier` - Zapier webhook integration
- `delay` - Wait specified minutes before next action
- `condition` - Evaluate conditions for branching logic
- `create_event` - Create calendar events

**Template Variables:**
- Uses `{{fieldName}}` syntax with nested field support (e.g., `{{booking.guestEmail}}`)
- Variables resolved at execution time from trigger context data

**Pre-built Templates:**
1. Booking Confirmation - Email notification on new bookings
2. Meeting Reminder - Email reminder 1 hour before meetings
3. Follow-up Email - Post-meeting follow-up with delay
4. Zapier Automation - Webhook trigger for external integrations
5. Conditional Routing - Route actions based on meeting type

**Database Tables:**
- `workflows` - Workflow definitions with trigger configuration
- `workflow_steps` - Action steps within workflows
- `workflow_executions` - Execution history and status tracking
- `workflow_step_executions` - Per-step execution results

**Key Files:**
- `server/utils/workflowExecutionService.ts` - Core execution engine
- `client/src/pages/Workflows.tsx` - Visual builder UI
- `server/routes.ts` - API endpoints (11+ workflow endpoints)
- `shared/schema.ts` - Database schema definitions

### Team Booking System

**Overview:**
Enables managers and admins to create shared scheduling events that check multiple team members' calendars and display available time slots when ANY team member is free. This maximizes scheduling options for guests.

**Access Control:**
- Only users with roles `admin`, `company_admin`, or `team_manager` can create team booking links
- Regular users cannot access team booking functionality
- Backend enforces role-based authorization on booking link creation

**Features:**
- Team selection from user's accessible teams
- Multi-select for specific team members whose calendars to check
- Assignment methods: round-robin, pooled, or specific
- Union-based availability: shows slots when ANY selected member is free (not all)
- Tracks which members are available for each slot for proper assignment
- External calendar sync (Google, Outlook, iCal) before availability check
- In-app guidance tooltips explaining setup requirements

**Setup Requirements:**
1. Create an Organization (Admin only) in Admin → Organization Management
2. Create a Team in Admin → Team Management
3. Assign users to the team in Admin → User Management
4. Create team booking link in Booking Links page

**Database Fields (booking_links table):**
- `is_team_booking` - Boolean flag for team booking links
- `team_id` - Reference to the team
- `team_member_ids` - JSON array of user IDs to include
- `assignment_method` - How bookings are assigned to team members

**Key Functions:**
- `findAnyMemberAvailability()` - Calculates union of team member availabilities
- `assignTeamMember()` - Assigns booking based on assignment method

**Key Files:**
- `server/utils/teamSchedulingService.ts` - Core availability calculation
- `client/src/pages/BookingLinks.tsx` - Team booking UI with tooltips
- `server/routes.ts` - API endpoints with role authorization

## Recent Changes

### Team Booking URL Format (2026-02-22)
- Team booking links now use `/{companySlug}/{teamSlug}/booking/{slug}` URL format instead of `/{firstName.lastName}/booking/{slug}`
- Added `GET /api/booking/:id/url` endpoint that returns the canonical booking URL for any booking link
- `URLDisplay` component calls this endpoint for consistent URL generation
- Embed code endpoint also uses canonical URL helper for team bookings
- Server-side booking path routing (`server/routes/bookingPaths.ts`) supports "combined" org/team path type
- `parseBookingPath` in `server/utils/pathUtils.ts` recognizes combined `/{org}/{team}/booking/{slug}` patterns
- Shared `slugifyName` utility ensures consistent slug generation across URL generation and routing