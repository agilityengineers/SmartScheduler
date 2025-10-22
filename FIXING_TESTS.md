# Fixing Failing Tests

If your tests fail on first run, don't worry! This is normal. Here's how to fix them.

## Understanding Test Failures

Tests were written with generic selectors based on common patterns. Your actual implementation may differ.

## Step 1: Download the Test Report

1. Go to the failed workflow run in GitHub Actions
2. Scroll to "Artifacts" section
3. Download `playwright-report.zip`
4. Unzip and open `index.html` in browser

The report shows:
- ❌ Which tests failed
- 📸 Screenshots of failures
- 🎥 Videos of what happened
- 📝 Step-by-step traces

## Step 2: Identify the Issue

Common failure types:

### 1. Element Not Found
```
Error: Locator.click:
Target closed
Selector: role=button[name=/sign up|register/i]
```

**Fix:** Update the selector to match your actual UI

```typescript
// Before (generic)
await page.getByRole('button', { name: /sign up|register/i }).click();

// After (your actual text)
await page.getByRole('button', { name: 'Create Account' }).click();
```

### 2. Wrong URL
```
Error: page.waitForURL:
Expected URL: /home|dashboard|calendar
Actual URL: /welcome
```

**Fix:** Update expected URL

```typescript
// Before
await page.waitForURL(/\/(home|dashboard|calendar)/);

// After (your actual route)
await page.waitForURL('/welcome');
```

### 3. Feature Not Implemented
```
Error: Locator.click:
No element found matching selector
```

**Fix:** Either:
- Skip the test for now: `test.skip('should do something', ...)`
- Implement the feature
- Remove the test if not needed

### 4. Timing Issues
```
Error: Timeout 30000ms exceeded
```

**Fix:** Increase timeout or add explicit waits

```typescript
// Add longer timeout
await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 60000 });

// Or wait for API
await page.waitForResponse(resp => resp.url().includes('/api/user'));
```

## Step 3: Fix Tests Locally

### Run Specific Failed Test

```bash
# Run just one test file
npx playwright test auth.spec.ts

# Run just one test
npx playwright test -g "should successfully register"

# Run in headed mode (see what's happening)
npx playwright test auth.spec.ts --headed

# Debug mode (step through)
npx playwright test auth.spec.ts --debug
```

### Update Test Code

Edit the test file (e.g., `e2e/auth.spec.ts`) to match your actual UI:

```typescript
// Example: Fix registration test
test('should successfully register a new user', async ({ page }) => {
  const user = generateTestUser();

  await page.goto('/');

  // Update these selectors to match YOUR app
  await page.getByRole('link', { name: 'Sign Up' }).click(); // Your exact text
  await page.getByLabel('Username').fill(user.username);    // Your exact label
  await page.getByLabel('Email Address').fill(user.email);  // Your exact label
  await page.getByLabel('Password').fill(user.password);
  await page.getByLabel('Confirm Password').fill(user.password);

  await page.getByRole('button', { name: 'Create Account' }).click();

  // Update expected URL to YOUR app's route
  await page.waitForURL('/welcome'); // or wherever you redirect

  // Verify logged in - update to match YOUR UI
  await expect(page.getByText(`Welcome, ${user.username}`)).toBeVisible();
});
```

## Step 4: Test Your Fixes

```bash
# Test your changes
npm run test:chromium

# If passes, try all browsers
npm test
```

## Step 5: Push Fixed Tests

```bash
git add e2e/
git commit -m "Fix E2E tests to match actual UI"
git push origin main
```

GitHub Actions will run again with your fixes!

## Common Fixes by Test Suite

### Authentication Tests (`auth.spec.ts`)

**Common issues:**
- Registration form field labels differ
- Redirect URL after login is different
- Logout button location/text differs

**How to find your actual selectors:**
1. Run `npm run test:ui`
2. Click on test
3. Use "Pick Locator" tool to find correct selectors
4. Update test with actual selectors

### Calendar Tests (`calendar.spec.ts`)

**Common issues:**
- No calendar page yet
- Different date picker implementation
- Event form fields have different names

**Quick fix:**
- If calendar not implemented: `test.skip` all calendar tests
- If different: Update selectors to match your implementation

### Booking Links Tests (`booking-links.spec.ts`)

**Common issues:**
- Booking links page route differs
- Form fields have different labels
- Public booking URL pattern differs

**Quick fix:**
- Update the route: `await page.goto('/your-actual-route')`
- Update form selectors to match your UI

### Settings Tests (`settings.spec.ts`)

**Common issues:**
- Settings organized differently (tabs vs accordions)
- Different field names
- Missing features

**Quick fix:**
- Comment out tests for unimplemented features
- Update navigation logic for your settings layout

## Step 6: Skip Unimplemented Features

If a feature doesn't exist yet, skip the test:

```typescript
test.skip('should create booking link', async ({ page }) => {
  // This feature isn't built yet
  // Will implement later
});

// Or skip entire describe block
test.describe.skip('Booking Links', () => {
  // All booking tests skipped for now
});
```

## Step 7: Iterate

1. Fix most critical tests first (auth, basic navigation)
2. Get those passing
3. Move on to feature-specific tests
4. Update as you build features

## Pro Tips

### Use Playwright Inspector

```bash
npx playwright test --debug
```

- Step through test line by line
- See what Playwright sees
- Pick locators visually
- Copy correct selectors

### Use Playwright Codegen

```bash
npx playwright codegen http://localhost:5000
```

- Records your actions
- Generates test code automatically
- Shows exact selectors to use

### Check Your UI First

Before fixing tests:
1. Open your app in browser
2. Verify the feature exists
3. Note exact button/label text
4. Check console for errors
5. Then update test to match

## Need Help?

- Check Playwright docs: https://playwright.dev
- Use `--debug` flag to step through
- Use `test.only()` to run one test
- Add `await page.pause()` to stop and inspect
- Check screenshots in test report

## Example: Complete Fix Flow

```bash
# 1. See test failure in GitHub Actions
# 2. Download playwright-report.zip
# 3. Open report, see "Button not found"
# 4. Run test locally in debug mode
npx playwright test auth.spec.ts --debug

# 5. Step through, see actual button text is "Get Started"
# 6. Update test
# 7. Re-run
npm run test:chromium

# 8. Pass! Commit and push
git add e2e/auth.spec.ts
git commit -m "Fix auth test button selector"
git push

# 9. Check GitHub Actions - should pass now!
```

Remember: It's normal for tests to need adjustments on first run. The test suite is comprehensive and will be very valuable once aligned with your actual implementation!
