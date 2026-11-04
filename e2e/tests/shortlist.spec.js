// shortlist.spec.js
// E2E journey: a logged-in user saves a flat. (The failed case, a visitor without an account trying to save,
// is in search.spec.js.)
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
import { test, expect } from '@playwright/test';

test('should save a flat to the shortlist when logged in', async ({ page }) => {
  // setup: create an account, then search a postal code that has exactly one flat
  // (761672 is Blk 672A Yishun Ave 4, from the seed data)
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
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();

  // assert: the button now says Saved, and no "create an account" message appears
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await expect(page.getByText('to save flats and keep your presets on any device')).not.toBeVisible();
});

test('should keep a note on a saved flat', async ({ page }) => {
  // setup: create an account, save a flat (761672 is Blk 672A Yishun Ave 4), and open the Shortlist page
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
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.getByRole('link', { name: 'Shortlist' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions: write a note and save it, then leave the page and come back
  await page.getByRole('textbox').fill('near my parents');
  await page.getByRole('button', { name: 'Save note' }).click();
  await page.getByRole('link', { name: 'Search' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('link', { name: 'Shortlist' }).click();

  // assert: the flat is still there with its note
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveValue('near my parents');
});

test('should remove a flat from the shortlist', async ({ page }) => {
  // setup: create an account, save a flat, and open the Shortlist page
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
  await page.getByRole('link', { name: 'Shortlist' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Remove' }).click();

  // assert: the flat is gone and the page says nothing is saved
  await expect(page.getByText('Nothing saved yet.')).toBeVisible();
  await expect(page.getByText('672A YISHUN AVE 4')).not.toBeVisible();
});

