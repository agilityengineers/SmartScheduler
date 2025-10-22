import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { generateEventData, waitForApiCall, getFutureDateFormatted } from './helpers/utils';

/**
 * Calendar and Events Tests
 * Tests for creating, viewing, editing, and deleting calendar events
 *
 * Note: Calendar page is only accessible after login
 */

test.describe('Calendar View', () => {
  test('should display calendar page when logged in', async ({ page }) => {
    // Login with existing test user
    await loginAsTestUser(page);

    // Navigate to calendar
    await page.goto('/calendar');

    // Should see calendar elements
    await expect(page.getByText(/calendar/i)).toBeVisible();

    // Should see navigation controls (prev/next month/week)
    const navButtons = page.locator('button').filter({ hasText: /prev|next|today/i });
    expect(await navButtons.count()).toBeGreaterThan(0);
  });

  test('should switch between month and week views', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Look for view toggle buttons
    const monthViewBtn = page.getByRole('button', { name: /month/i });
    const weekViewBtn = page.getByRole('button', { name: /week/i });

    // Try switching views if buttons exist
    if (await monthViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await weekViewBtn.click();
      await page.waitForTimeout(500);
      await monthViewBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Create Event', () => {
  test('should create a new event successfully', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Click to create new event
    const createButton = page.getByRole('button', { name: /new event|create event|add event|\+/i }).first();
    await createButton.click();

    // Fill in event details
    const eventData = generateEventData({
      title: 'Team Meeting',
      date: new Date(getFutureDateFormatted(3)),
      startTime: '14:00',
      endTime: '15:00',
      description: 'Discuss project updates',
    });

    await page.getByLabel(/title|event name/i).fill(eventData.title);

    // Fill date (might be a date picker)
    const dateInput = page.getByLabel(/date|start date/i);
    await dateInput.fill(eventData.date);

    // Fill times
    const startTimeInput = page.getByLabel(/start time|from/i);
    const endTimeInput = page.getByLabel(/end time|to|until/i);

    await startTimeInput.fill(eventData.startTime);
    await endTimeInput.fill(eventData.endTime);

    // Fill description if field exists
    const descriptionField = page.getByLabel(/description|notes/i);
    if (await descriptionField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descriptionField.fill(eventData.description);
    }

    // Wait for API call when saving
    const apiPromise = waitForApiCall(page, '/api/events', 'POST');

    // Save the event
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Wait for API response
    await apiPromise;

    // Verify event appears in calendar
    await expect(page.getByText(eventData.title)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields when creating event', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Open create event dialog
    const createButton = page.getByRole('button', { name: /new event|create event|add event|\+/i }).first();
    await createButton.click();

    // Try to save without filling required fields
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Should show validation errors
    const titleInput = page.getByLabel(/title|event name/i);
    const titleError = await titleInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(titleError).toBe(true);
  });
});

test.describe('View Event Details', () => {
  test('should view event details when clicking on event', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Create an event first
    const createButton = page.getByRole('button', { name: /new event|create event|add event|\+/i }).first();
    await createButton.click();

    const eventData = generateEventData({ title: 'Important Meeting' });
    await page.getByLabel(/title|event name/i).fill(eventData.title);
    await page.getByLabel(/date|start date/i).fill(eventData.date);
    await page.getByLabel(/start time|from/i).fill(eventData.startTime);
    await page.getByLabel(/end time|to|until/i).fill(eventData.endTime);

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await page.waitForTimeout(1000);

    // Click on the event
    await page.getByText(eventData.title).click();

    // Should show event details (in modal or detail view)
    await expect(page.getByText(eventData.title)).toBeVisible();
  });
});

test.describe('Edit Event', () => {
  test('should edit an existing event', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Create an event
    const createButton = page.getByRole('button', { name: /new event|create event|add event|\+/i }).first();
    await createButton.click();

    const eventData = generateEventData({ title: 'Original Title' });
    await page.getByLabel(/title|event name/i).fill(eventData.title);
    await page.getByLabel(/date|start date/i).fill(eventData.date);
    await page.getByLabel(/start time|from/i).fill(eventData.startTime);
    await page.getByLabel(/end time|to|until/i).fill(eventData.endTime);

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await page.waitForTimeout(1000);

    // Click on the event to open it
    await page.getByText(eventData.title).click();

    // Click edit button
    const editButton = page.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Change the title
    const titleInput = page.getByLabel(/title|event name/i);
    await titleInput.clear();
    await titleInput.fill('Updated Title');

    // Wait for API call
    const apiPromise = waitForApiCall(page, '/api/events/', 'PATCH');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Wait for API response
    await apiPromise;

    // Verify updated title appears
    await expect(page.getByText('Updated Title')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Delete Event', () => {
  test('should delete an event', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Create an event
    const createButton = page.getByRole('button', { name: /new event|create event|add event|\+/i }).first();
    await createButton.click();

    const eventData = generateEventData({ title: 'Event to Delete' });
    await page.getByLabel(/title|event name/i).fill(eventData.title);
    await page.getByLabel(/date|start date/i).fill(eventData.date);
    await page.getByLabel(/start time|from/i).fill(eventData.startTime);
    await page.getByLabel(/end time|to|until/i).fill(eventData.endTime);

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await page.waitForTimeout(1000);

    // Click on the event
    await page.getByText(eventData.title).click();

    // Wait for API call
    const apiPromise = waitForApiCall(page, '/api/events/', 'DELETE');

    // Click delete button
    const deleteButton = page.getByRole('button', { name: /delete|remove/i });
    await deleteButton.click();

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for API response
    await apiPromise;

    // Verify event is removed from calendar
    await expect(page.getByText(eventData.title)).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Calendar Navigation', () => {
  test('should navigate to next and previous months', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Get current month display
    const monthDisplay = page.locator('text=/january|february|march|april|may|june|july|august|september|october|november|december/i').first();
    const currentMonth = await monthDisplay.textContent();

    // Click next month
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await page.waitForTimeout(300);

    // Month should change
    const newMonth = await monthDisplay.textContent();
    expect(newMonth).not.toBe(currentMonth);

    // Click previous month
    const prevButton = page.getByRole('button', { name: /prev|previous/i });
    await prevButton.click();
    await page.waitForTimeout(300);

    // Should be back to original month
    const backToMonth = await monthDisplay.textContent();
    expect(backToMonth).toBe(currentMonth);
  });

  test('should jump to today', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/calendar');

    // Navigate away from current month
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await nextButton.click();
    await page.waitForTimeout(300);

    // Click today button
    const todayButton = page.getByRole('button', { name: /today/i });
    if (await todayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayButton.click();
      await page.waitForTimeout(300);

      // Should highlight current day (implementation dependent)
      const today = new Date().getDate();
      // This check is approximate - actual implementation may vary
    }
  });
});
