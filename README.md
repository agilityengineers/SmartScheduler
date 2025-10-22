# SmartScheduler

![Playwright Tests](https://github.com/agilityengineers/SmartScheduler/actions/workflows/playwright.yml/badge.svg)

A full-stack scheduling and calendar application built with React and Express.

## Features

- 📅 **Calendar Management** - Create, edit, and manage events
- 🔗 **Booking Links** - Shareable links for scheduling appointments
- 👥 **Team Scheduling** - Coordinate availability across team members
- 🔄 **Calendar Integrations** - Sync with Google Calendar, Outlook, and iCal
- 💳 **Stripe Integration** - Subscription-based pricing
- 🔐 **Authentication** - Secure user accounts with role-based access
- ⏰ **Timezone Support** - Automatic timezone conversion
- 📧 **Email Notifications** - Booking confirmations and reminders

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- React Query (state management)
- Wouter (routing)

**Backend:**
- Node.js + Express
- PostgreSQL + Drizzle ORM
- Session-based authentication
- Nodemailer (email)
- Stripe (payments)

**Testing:**
- Playwright (E2E tests)
- 126 tests across Chromium, Firefox, and WebKit
- GitHub Actions CI/CD

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## Development

```bash
# Run dev server with hot reload
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm start
```

## Testing

```bash
# Run E2E tests (requires browser dependencies)
npm test

# Run in UI mode (interactive)
npm run test:ui

# Run specific browser
npm run test:chromium

# View last test report
npm run test:report
```

**Note:** E2E tests require system dependencies not available in Replit. Run locally or use GitHub Actions (runs automatically on push).

See [e2e/README.md](e2e/README.md) for detailed testing documentation.

## GitHub Actions

This project includes automated testing workflows:

- ✅ **CI Tests** - Runs on every push and PR
- 🌙 **Nightly Tests** - Scheduled regression testing
- 📊 **Test Reports** - Downloadable artifacts with screenshots and videos
- 💬 **PR Comments** - Automatic test result summaries

See [GITHUB_SETUP.md](GITHUB_SETUP.md) for setup instructions.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project overview and architecture
- **[e2e/README.md](e2e/README.md)** - Testing documentation
- **[GITHUB_SETUP.md](GITHUB_SETUP.md)** - GitHub Actions setup guide
- **[FIXING_TESTS.md](FIXING_TESTS.md)** - How to fix failing tests

## Project Structure

```
/client/src/          - React frontend
/server/              - Express backend
/shared/              - Shared TypeScript types
/e2e/                 - Playwright E2E tests
/.github/workflows/   - GitHub Actions CI/CD
```

## Environment Variables

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

Optional:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` - Microsoft OAuth
- `STRIPE_SECRET_KEY` - Stripe payments
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` - Email configuration

See [CLAUDE.md](CLAUDE.md) for complete documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests locally
5. Submit a pull request

Tests must pass before merging!

## License

MIT
