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
  await page.locator('#login-email').fill('e2e-' + Date.now() + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  await page.locator('#login-confirm').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();

  // assert: the button now says Saved, and no "needs an account" message appears
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await expect(page.getByText('Saving flats needs an account.')).not.toBeVisible();
});
