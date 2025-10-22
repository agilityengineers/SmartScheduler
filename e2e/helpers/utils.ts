import { Page } from '@playwright/test';
import { addDays, format, startOfDay } from 'date-fns';

/**
 * Common utility functions for Playwright tests
 */

/**
 * Generate a unique booking link slug
 */
export function generateBookingSlug(prefix: string = 'test-booking') {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
}

/**
 * Generate test event data
 */
export function generateEventData(overrides?: {
  title?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  description?: string;
}) {
  const date = overrides?.date || new Date();
  return {
    title: overrides?.title || `Test Event ${Date.now()}`,
    date: format(date, 'yyyy-MM-dd'),
    startTime: overrides?.startTime || '10:00',
    endTime: overrides?.endTime || '11:00',
    description: overrides?.description || 'This is a test event',
  };
}

/**
 * Generate test booking link data
 */
export function generateBookingLinkData(overrides?: {
  name?: string;
  slug?: string;
  duration?: number;
  description?: string;
}) {
  return {
    name: overrides?.name || `Test Booking ${Date.now()}`,
    slug: overrides?.slug || generateBookingSlug(),
    duration: overrides?.duration || 30,
    description: overrides?.description || 'Test booking link description',
  };
}

/**
 * Wait for a specific API call to complete
 */
export async function waitForApiCall(page: Page, endpoint: string, method: string = 'GET') {
  return page.waitForResponse(
    (response) => response.url().includes(endpoint) && response.request().method() === method,
    { timeout: 10000 }
  );
}

/**
 * Wait for navigation and loading to complete
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Get today's date formatted for date inputs
 */
export function getTodayFormatted(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get a future date formatted for date inputs
 */
export function getFutureDateFormatted(daysAhead: number = 7): string {
  return format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
}

/**
 * Fill a date input field (handles different date picker implementations)
 */
export async function fillDateInput(page: Page, selector: string, date: string) {
  const input = page.locator(selector);
  await input.fill(date);
  // Press Enter to confirm in case date picker requires it
  await input.press('Enter');
}

/**
 * Select a time from a time picker
 */
export async function selectTime(page: Page, selector: string, time: string) {
  const input = page.locator(selector);
  await input.fill(time);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}-${Date.now()}.png`, fullPage: true });
}

/**
 * Wait for toast/notification message
 */
export async function waitForNotification(page: Page, messageText?: string) {
  const toast = page.locator('[role="status"], .toast, .notification').first();
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  if (messageText) {
    await page.getByText(messageText, { exact: false }).waitFor({ state: 'visible' });
  }

  return toast;
}

/**
 * Dismiss notification/toast if present
 */
export async function dismissNotification(page: Page) {
  const closeButton = page.locator('[role="status"] button, .toast button, .notification button').first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
  }
}

/**
 * Clear all form fields on the page
 */
export async function clearForm(page: Page) {
  const inputs = page.locator('input[type="text"], input[type="email"], textarea');
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    await inputs.nth(i).clear();
  }
}
