// compare.spec.js
// E2E journey: a logged-in user saves two flats and compares them side by side.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
// 761672 is Blk 672A Yishun Ave 4 and 752593 is Blk 593B Montreal Link: each has exactly one flat in the seed data,
// so each search shows exactly one Save button.
import { test, expect } from '@playwright/test';

test('should compare two saved flats side by side', async ({ page }) => {
  // setup: create an account and save two flats
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  await page.locator('#login-confirm').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  // creating an account makes the Search tour start again about a second later: close it now, so it cannot open
  // in the middle of a later step and cover the page
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.getByRole('searchbox').fill('752593');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('593B MONTREAL LINK')).toBeVisible();
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

  // actions: open Compare and tick both flats
  await page.getByRole('link', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('Tick at least 2 flats to compare.')).toBeVisible();
  await page.getByRole('checkbox', { name: '672A YISHUN AVE 4' }).click();
  await page.getByRole('checkbox', { name: '593B MONTREAL LINK' }).click();

  // assert: the side-by-side table appears
  await expect(page.getByText('Estimated price (model)')).toBeVisible();
  await expect(page.getByText('Tick at least 2 flats to compare.')).not.toBeVisible();
});

test('should ask for at least 2 saved flats before comparing', async ({ page }) => {
  // setup: create an account (nothing saved)
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  await page.locator('#login-confirm').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  // creating an account makes the Search tour start again about a second later: close it now, so it cannot open
  // in the middle of a later step and cover the page
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions
  await page.getByRole('link', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // assert
  await expect(page.getByText('Save at least 2 flats to your shortlist first')).toBeVisible();
});
