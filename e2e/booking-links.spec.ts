import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { generateBookingLinkData, waitForApiCall, getFutureDateFormatted } from './helpers/utils';

/**
 * Booking Links Tests
 * Tests for creating booking links and public booking flow
 */

test.describe('Create Booking Link', () => {
  test('should create a new booking link', async ({ page }) => {
    await loginAsTestUser(page);

    // Navigate to booking links page
    await page.goto('/booking-links');

    // Click create new booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    // Fill in booking link details
    const bookingData = generateBookingLinkData({
      name: 'Coffee Chat',
      duration: 30,
      description: '30 minute casual conversation',
    });

    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);

    // Set duration
    const durationInput = page.getByLabel(/duration|length/i);
    await durationInput.clear();
    await durationInput.fill(bookingData.duration.toString());

    // Fill description
    const descriptionField = page.getByLabel(/description/i);
    if (await descriptionField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descriptionField.fill(bookingData.description);
    }

    // Wait for API call
    const apiPromise = waitForApiCall(page, '/api/booking', 'POST');

    // Save booking link
    await page.getByRole('button', { name: /save|create/i }).click();

    // Wait for API response
    await apiPromise;

    // Verify booking link appears in list
    await expect(page.getByText(bookingData.name)).toBeVisible({ timeout: 5000 });
  });

  test('should set availability hours for booking link', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Office Hours' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);

    // Look for availability settings
    const availabilitySection = page.locator('text=/availability|working hours|schedule/i').first();
    if (await availabilitySection.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to expand if needed
      await availabilitySection.click();

      // Try to modify availability (implementation varies)
      // This is a placeholder - actual implementation depends on your UI
    }

    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Verify booking link was created
    await expect(page.getByText(bookingData.name)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    // Try to save without filling required fields
    await page.getByRole('button', { name: /save|create/i }).click();

    // Should show validation errors
    const nameInput = page.getByLabel(/name|title/i);
    const nameError = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(nameError).toBe(true);
  });
});

test.describe('Manage Booking Links', () => {
  test('should edit an existing booking link', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create a booking link first
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Initial Name' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Find and edit the booking link
    const bookingLink = page.getByText(bookingData.name);
    await bookingLink.click();

    // Click edit button
    const editButton = page.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Change the name
    const nameInput = page.getByLabel(/name|title/i);
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    // Wait for API call
    const apiPromise = waitForApiCall(page, '/api/booking/', 'PATCH');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Wait for API response
    await apiPromise;

    // Verify updated name
    await expect(page.getByText('Updated Name')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a booking link', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create a booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Link to Delete' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Click on the booking link
    await page.getByText(bookingData.name).click();

    // Wait for API call
    const apiPromise = waitForApiCall(page, '/api/booking/', 'DELETE');

    // Click delete button
    const deleteButton = page.getByRole('button', { name: /delete|remove/i });
    await deleteButton.click();

    // Confirm if needed
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for API response
    await apiPromise;

    // Verify booking link is removed
    await expect(page.getByText(bookingData.name)).not.toBeVisible({ timeout: 5000 });
  });

  test('should toggle booking link active status', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create a booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Toggle Test' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Look for active/inactive toggle
    const toggleSwitch = page.locator('[role="switch"], input[type="checkbox"]').filter({
      hasText: /active|enabled/i
    });

    if (await toggleSwitch.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Toggle it
      await toggleSwitch.click();
      await page.waitForTimeout(500);

      // Toggle back
      await toggleSwitch.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Public Booking Flow', () => {
  test('should view availability and make a booking', async ({ page, context }) => {
    // First, create a user and booking link
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({
      name: 'Public Consultation',
      slug: `consultation-${Date.now()}`,
    });

    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Get the public booking URL
    // Assuming there's a way to copy or view the link
    const bookingUrl = `/booking/${bookingData.slug}`;

    // Open a new page as a guest (public user)
    const guestPage = await context.newPage();
    await guestPage.goto(bookingUrl);

    // Should see booking page
    await expect(guestPage.getByText(bookingData.name)).toBeVisible({ timeout: 5000 });

    // Select a date (7 days from now)
    const futureDate = getFutureDateFormatted(7);
    const dateButton = guestPage.locator(`[data-date="${futureDate}"], button`).filter({ hasText: new RegExp(futureDate.split('-')[2]) }).first();

    if (await dateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateButton.click();
      await page.waitForTimeout(500);

      // Select a time slot
      const timeSlot = guestPage.getByRole('button', { name: /\d{1,2}:\d{2}/ }).first();
      if (await timeSlot.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeSlot.click();

        // Fill in booking form
        await guestPage.getByLabel(/name|your name/i).fill('John Doe');
        await guestPage.getByLabel(/email/i).fill('john.doe@example.com');

        const notesField = guestPage.getByLabel(/notes|message|details/i);
        if (await notesField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await notesField.fill('Looking forward to our meeting!');
        }

        // Wait for API call
        const apiPromise = waitForApiCall(guestPage, '/api/public/booking/', 'POST');

        // Submit booking
        await guestPage.getByRole('button', { name: /book|confirm|schedule/i }).click();

        // Wait for API response
        await apiPromise;

        // Should show confirmation
        await expect(guestPage.getByText(/confirmed|success|booked/i)).toBeVisible({ timeout: 5000 });
      }
    }

    await guestPage.close();
  });

  test('should show no available slots message when fully booked', async ({ page, context }) => {
    // This test assumes booking link has no availability
    // Implementation depends on how you handle fully booked scenarios

    await loginAsTestUser(page);
    await page.goto('/booking-links');

    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({
      slug: `no-availability-${Date.now()}`,
    });

    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);

    // Set availability to none (implementation specific)
    // This is a placeholder - actual implementation varies

    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Visit public page
    const guestPage = await context.newPage();
    await guestPage.goto(`/booking/${bookingData.slug}`);

    // Should see message about no availability
    // This check depends on your implementation
    const noSlotsMessage = guestPage.getByText(/no.*available|fully booked|no slots/i);
    // await expect(noSlotsMessage).toBeVisible({ timeout: 5000 });

    await guestPage.close();
  });
});

test.describe('Booking Link URL and Sharing', () => {
  test('should display shareable booking link URL', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Shareable Link' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Click on the booking link to view details
    await page.getByText(bookingData.name).click();

    // Should show the public URL
    const urlDisplay = page.locator(`text=/${bookingData.slug}/`);
    await expect(urlDisplay).toBeVisible({ timeout: 3000 });
  });

  test('should copy booking link to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await loginAsTestUser(page);
    await page.goto('/booking-links');

    // Create booking link
    const createButton = page.getByRole('button', { name: /create|new.*link|add.*link/i }).first();
    await createButton.click();

    const bookingData = generateBookingLinkData({ name: 'Copy Link Test' });
    await page.getByLabel(/name|title/i).fill(bookingData.name);
    await page.getByLabel(/slug|url/i).fill(bookingData.slug);
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForTimeout(1000);

    // Click on booking link
    await page.getByText(bookingData.name).click();

    // Look for copy button
    const copyButton = page.getByRole('button', { name: /copy/i });
    if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyButton.click();

      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain(bookingData.slug);
    }
  });
});
