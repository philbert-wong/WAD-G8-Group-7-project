// compare-mobile.spec.js
// E2E journey at phone width (the "iphone-6" project in playwright.config.js runs the tests in this folder at 375 x 667).
// On a phone the Compare table is turned on its side: each row becomes a group, with a line per flat under it.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
// 761672 is Blk 672A Yishun Ave 4 and 752593 is Blk 593B Montreal Link: each has exactly one flat in the seed data.
import { test, expect } from '@playwright/test';

test('should compare two saved flats on a phone', async ({ page }) => {
  // setup: create an account and save two flats
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  // every new account answers the 3 security questions (for Forgot password)
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
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
  await page.getByRole('checkbox', { name: '672A YISHUN AVE 4' }).click();
  await page.getByRole('checkbox', { name: '593B MONTREAL LINK' }).click();

  // assert: a row heading, and the price of each flat under it
  await expect(page.getByText('Price range')).toBeVisible();
  await expect(page.getByText('$330,000 – $370,000')).toBeVisible();
  await expect(page.getByText('$351,888 – $380,000')).toBeVisible();
});

test('should show the Compare tour step on a phone without covering the first card', async ({ page }) => {
  // setup: create an account, save two flats, and tick both on the Compare page
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  // every new account answers the 3 security questions (for Forgot password)
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
  await page.locator('#login-confirm').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
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
  await page.getByRole('link', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('checkbox', { name: '672A YISHUN AVE 4' }).click();
  await page.getByRole('checkbox', { name: '593B MONTREAL LINK' }).click();
  await expect(page.getByText('Price range')).toBeVisible();

  // actions: open the page tour from the ? button and go to its second step
  await page.getByRole('button', { name: 'Help: a quick tour of this page' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // assert: the step is shown, and the first card (Price range) is still in view next to it
  await expect(page.getByText('Side by side', { exact: true }).last()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  await expect(page.getByText('$330,000 – $370,000')).toBeVisible();
});

