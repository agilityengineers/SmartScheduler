import { test, expect } from '@playwright/test';
import { registerUser, login, logout, generateTestUser, isLoggedIn } from './helpers/auth';

/**
 * Authentication Tests
 * Tests for user registration, login, logout, and session management
 */

test.describe('User Registration', () => {
  test('should successfully register a new user', async ({ page }) => {
    const user = await registerUser(page);

    // Verify we're on a logged-in page (home, dashboard, or calendar)
    await expect(page).toHaveURL(/\/(home|dashboard|calendar)/);

    // Verify user is logged in by checking for logout button or user menu
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });

  test('should show error when registering with existing username', async ({ page }) => {
    // Register first user
    const user = generateTestUser();
    await registerUser(page, user);

    // Logout
    await logout(page);

    // Try to register again with same username
    await page.goto('/');
    await page.getByRole('link', { name: /sign up|register/i }).click();

    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(`different_${user.email}`);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);

    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Should show error message
    await expect(page.getByText(/username.*already.*taken|username.*exists/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    const user = generateTestUser();

    await page.goto('/');
    await page.getByRole('link', { name: /sign up|register/i }).click();

    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill('DifferentPassword123!');

    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Should show error message about password mismatch
    await expect(page.getByText(/password.*match|passwords.*not.*match/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('User Login', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // First register a user
    const user = await registerUser(page);

    // Logout
    await logout(page);

    // Now login with the same credentials
    await login(page, user.username, user.password);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/(home|dashboard|calendar)/);
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');

    // Navigate to login
    const loginLink = page.getByRole('link', { name: /log in|sign in/i });
    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click();
    }

    // Try to login with fake credentials
    await page.getByLabel(/username|email/i).fill('nonexistentuser');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid.*credentials|incorrect.*username.*password|login.*failed/i))
      .toBeVisible({ timeout: 5000 });
  });

  test('should require both username and password', async ({ page }) => {
    await page.goto('/');

    // Navigate to login
    const loginLink = page.getByRole('link', { name: /log in|sign in/i });
    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click();
    }

    // Try to submit without filling fields
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Should show validation errors or prevent submission
    const usernameInput = page.getByLabel(/username|email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Check if HTML5 validation triggered
    const usernameRequired = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const passwordRequired = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(usernameRequired || passwordRequired).toBe(true);
  });
});

test.describe('User Logout', () => {
  test('should successfully logout', async ({ page }) => {
    // Register and login
    const user = await registerUser(page);

    // Verify logged in
    let loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    // Logout
    await logout(page);

    // Verify logged out (redirected to home or login page)
    await expect(page).toHaveURL(/\/(|login|signin)/);

    // Verify logout button is no longer visible
    loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(false);
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session after page reload', async ({ page }) => {
    // Register user
    const user = await registerUser(page);

    // Reload the page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/\/(home|dashboard|calendar)/);
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });

  test('should maintain session when navigating between pages', async ({ page }) => {
    // Register user
    await registerUser(page);

    // Navigate to different pages
    await page.goto('/calendar');
    let loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    await page.goto('/settings');
    loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });
});
