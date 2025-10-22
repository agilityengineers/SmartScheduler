import { Page, expect } from '@playwright/test';

/**
 * Authentication helper utilities for Playwright tests
 */

// Generate unique test user data
export function generateTestUser() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    timezone: 'America/New_York',
  };
}

/**
 * Register a new user account
 */
export async function registerUser(page: Page, userData?: {
  username: string;
  email: string;
  password: string;
  timezone?: string;
}) {
  const user = userData || generateTestUser();

  await page.goto('/');

  // Navigate to register page
  await page.getByRole('link', { name: /sign up|register/i }).click();

  // Fill in registration form
  await page.getByLabel(/username/i).fill(user.username);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);
  await page.getByLabel(/confirm password/i).fill(user.password);

  // Select timezone if available
  if (user.timezone) {
    const timezoneSelect = page.locator('select').filter({ hasText: /timezone/i });
    if (await timezoneSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await timezoneSelect.selectOption(user.timezone);
    }
  }

  // Submit form
  await page.getByRole('button', { name: /sign up|register|create account/i }).click();

  // Wait for successful registration (redirect to home or dashboard)
  await page.waitForURL(/\/(home|dashboard|calendar)/, { timeout: 10000 });

  return user;
}

/**
 * Login with existing credentials
 */
export async function login(page: Page, username: string, password: string) {
  await page.goto('/');

  // Check if already logged in
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    return; // Already logged in
  }

  // Navigate to login page if not already there
  const loginLink = page.getByRole('link', { name: /log in|sign in/i });
  if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginLink.click();
  }

  // Fill in login form
  await page.getByLabel(/username|email/i).fill(username);
  await page.getByLabel(/password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Wait for successful login
  await page.waitForURL(/\/(home|dashboard|calendar)/, { timeout: 10000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Look for logout button in header or menu
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

  // Check if user menu needs to be opened
  const userMenu = page.getByRole('button', { name: /account|profile|user menu/i });
  if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenu.click();
  }

  await logoutButton.click();

  // Wait for redirect to login/home page
  await page.waitForURL(/\/(|login|signin)/, { timeout: 5000 });
}

/**
 * Create an authenticated page with a registered user
 * Useful for tests that need to start with an authenticated state
 */
export async function createAuthenticatedPage(page: Page) {
  const user = await registerUser(page);
  return { page, user };
}

/**
 * Check if user is currently logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for presence of logout button or user menu
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  const userMenu = page.getByRole('button', { name: /account|profile|user menu/i });

  const logoutVisible = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
  const menuVisible = await userMenu.isVisible({ timeout: 1000 }).catch(() => false);

  return logoutVisible || menuVisible;
}
