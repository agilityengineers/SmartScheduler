# End-to-End Tests with Playwright

This directory contains end-to-end tests for the SmartScheduler application using Playwright.

## 🚀 Getting Started

### Prerequisites

- Node.js installed
- Dev server running (or tests will start it automatically)
- PostgreSQL database configured

### Running Tests

```bash
# Run all tests (headless mode across all browsers)
npm test

# Run tests with visible browser (headed mode)
npm run test:headed

# Open Playwright UI mode (interactive)
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests on specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# View test report
npm run test:report
```

## 📁 Test Structure

```
e2e/
├── auth.spec.ts           - Authentication tests (login, register, logout)
├── calendar.spec.ts       - Calendar and event management tests
├── booking-links.spec.ts  - Booking links creation and public booking flow
├── settings.spec.ts       - User settings and preferences tests
└── helpers/
    ├── auth.ts           - Authentication helper functions
    └── utils.ts          - Common utility functions
```

## 🧪 Test Suites

### Authentication Tests (`auth.spec.ts`)
- User registration (success and validation)
- User login (success and error handling)
- User logout
- Session persistence

### Calendar & Events Tests (`calendar.spec.ts`)
- Calendar view display
- Create, view, edit, and delete events
- Calendar navigation (month/week views)
- Event validation

### Booking Links Tests (`booking-links.spec.ts`)
- Create and manage booking links
- Set availability hours
- Public booking flow (guest users)
- Shareable link URLs

### Settings Tests (`settings.spec.ts`)
- User profile updates
- Timezone preferences
- Working hours configuration
- Calendar integrations
- Notification preferences
- Password changes

## 🛠️ Helper Functions

### Authentication Helpers (`helpers/auth.ts`)
- `registerUser(page, userData?)` - Register a new test user
- `login(page, username, password)` - Login with credentials
- `logout(page)` - Logout current user
- `generateTestUser()` - Generate unique test user data
- `isLoggedIn(page)` - Check if user is authenticated

### Utility Helpers (`helpers/utils.ts`)
- `generateBookingSlug(prefix)` - Create unique booking slugs
- `generateEventData(overrides)` - Generate test event data
- `generateBookingLinkData(overrides)` - Generate test booking link data
- `waitForApiCall(page, endpoint, method)` - Wait for specific API calls
- `getFutureDateFormatted(daysAhead)` - Get formatted future dates
- `waitForNotification(page, messageText)` - Wait for toast messages

## 📝 Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Setup - register/login if needed
    await registerUser(page);

    // Navigate to page
    await page.goto('/your-page');

    // Perform actions
    await page.getByRole('button', { name: /click me/i }).click();

    // Assert results
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names** - Should read like documentation
2. **Keep tests independent** - Each test should work in isolation
3. **Use helper functions** - Reuse auth and common utilities
4. **Wait for API calls** - Use `waitForApiCall()` for reliable tests
5. **Use semantic selectors** - Prefer `getByRole`, `getByLabel` over CSS selectors
6. **Clean up test data** - Tests create unique data to avoid conflicts

## 🎯 Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5000`
- **Browsers**: Chromium, Firefox, WebKit
- **Test Directory**: `./e2e`
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure
- **Traces**: Captured on first retry

## 🐛 Debugging Tests

### View traces
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test auth.spec.ts
```

### Run specific test
```bash
npx playwright test -g "should successfully login"
```

### Debug mode
```bash
npm run test:debug
```

## 🔍 Common Issues

### Tests fail with "Address already in use"
- Make sure no other instance of the dev server is running
- Kill the process on port 5000: `lsof -ti:5000 | xargs kill`

### Browser dependencies missing
- Run: `npx playwright install-deps`
- This installs system dependencies for browsers

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is responding
- Verify database is accessible

## 📊 CI/CD Integration

### GitHub Actions

This project includes automated GitHub Actions workflows for running E2E tests:

#### 🔄 Continuous Integration (`.github/workflows/playwright.yml`)

Automatically runs tests on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop` branches

Features:
- ✅ Runs all 126 tests across Chromium, Firefox, and WebKit
- ✅ Uses PostgreSQL service container for database
- ✅ Uploads test reports as artifacts (30-day retention)
- ✅ Automatically comments on PRs with test results
- ✅ Fail-fast disabled to see all test results

#### ⏰ Scheduled Tests (`.github/workflows/playwright-scheduled.yml`)

Runs nightly at 2 AM UTC to catch regressions early.

Features:
- 🌙 Scheduled runs every night
- 🎯 Manual trigger via workflow dispatch
- 🌐 Optional: Run specific browser only
- 📧 Failure notifications

#### 🚀 Manual Test Runs

You can manually trigger tests from GitHub:

1. Go to **Actions** tab in your repository
2. Select **"Scheduled E2E Tests"** workflow
3. Click **"Run workflow"**
4. Choose browser (or run all)
5. Click **"Run workflow"** button

### View Test Results

After tests run, you can:

1. **View in GitHub Actions**
   - Go to the Actions tab
   - Click on a workflow run
   - See test summary and status

2. **Download Test Report**
   - Scroll to "Artifacts" section
   - Download `playwright-report.zip`
   - Unzip and open `index.html` in browser

3. **PR Comments**
   - Test results automatically posted as PR comments
   - Includes pass/fail summary and trends

### Status Badge

Add to your README.md:

```markdown
![Playwright Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/playwright.yml/badge.svg)
```

### Environment Requirements

The CI workflow automatically:
- ✅ Sets up Node.js 18
- ✅ Installs all dependencies
- ✅ Installs Playwright browsers with system deps
- ✅ Configures PostgreSQL test database
- ✅ Sets required environment variables
- ✅ Runs database migrations

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
