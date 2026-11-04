// search-mobile.spec.js
// E2E journeys at phone width (the "iphone-6" project in playwright.config.js runs the tests in this folder at 375 x 667).
// On a phone the filters are in a drawer opened by the "☰ Filters" button, and each flat card keeps Save and
// Show on map in view, with Street View, Price details and Amenities under "More details".
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
import { test, expect } from '@playwright/test';

test('should filter the flats from the filter drawer on a phone', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions: open the drawer and choose 4-room flats
  await page.getByRole('button', { name: '☰ Filters' }).click();
  await page.getByRole('button', { name: '4-Rm' }).click();

  // assert: the results follow the filter, and no 3-room flat is left
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await expect(page.getByText('3 ROOM')).not.toBeVisible();
});

test('should show the map and street view buttons on a flat card on a phone', async ({ page }) => {
  // setup: search a postal code that has exactly one flat (761672 is Blk 672A Yishun Ave 4)
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  // On a phone, Street View, Price details and Amenities are under "More details" (to keep each card short)
  await page.getByRole('button', { name: 'More details' }).click();

  // assert: the card's map buttons are on the screen
  await expect(page.getByRole('button', { name: 'Show on map' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Street View' })).toBeVisible();
});
