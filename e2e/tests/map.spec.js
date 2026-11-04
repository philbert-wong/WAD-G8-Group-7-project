// map.spec.js
// E2E journey: the Map page, opened from the menu and from a flat's "Show on map" button.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
// 761672 is Blk 672A Yishun Ave 4: it has exactly one flat in the seed data, so there is only one card.
import { test, expect } from '@playwright/test';

test('should open the map page from the menu', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions
  await page.getByRole('link', { name: 'Map' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // assert: the page title and the options for the dots
  await expect(page.getByText('See it on')).toBeVisible();
  await expect(page.getByText('Show amenities')).toBeVisible();
});

test('should open a flat on the map from its Show on map button', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Show on map' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // assert: the map page opens with that block selected (its name is the heading of the block card)
  await expect(page.getByText('See it on')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Blk 672A YISHUN AVE 4' })).toBeVisible();
});
