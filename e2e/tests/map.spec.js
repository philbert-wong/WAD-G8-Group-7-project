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

test('should offer to log in when a visitor without an account points at My shortlist', async ({ page }) => {
  // setup: open the map as a visitor (not logged in)
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Map' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('Log in to show only your shortlist.')).not.toBeVisible();

  // actions: point at the locked button
  await page.getByText('My shortlist').hover();

  // assert: the popup shows with a link that opens the Login page
  await expect(page.getByText('Log in to show only your shortlist.')).toBeVisible();
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('should save a flat from the dot popup on the map when logged in', async ({ page }) => {
  // setup: create an account, search a postal code that has exactly one flat, and open it on the map
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
  // creating an account makes the Search tour start again: close it now, so it cannot open in the middle of a later step
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await page.getByRole('button', { name: 'Show on map' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  // the block opens with its popup on the map (its Save button is in there) and its card in the sidebar
  const popup = page.locator('.leaflet-popup');
  const card = page.locator('.m-selected');
  await expect(popup.getByText('Blk 672A YISHUN AVE 4')).toBeVisible();

  // actions: save the flat from the popup
  await popup.getByRole('button', { name: /^Save .* to shortlist$/ }).click();

  // assert: the popup, the card and the "My shortlist" count all say it is saved
  await expect(popup.getByRole('button', { name: /^Saved .* \(press to remove\)$/ })).toBeVisible();
  await expect(card.getByRole('button', { name: /^Saved .* \(press to remove\)$/ })).toBeVisible();
  await expect(page.getByText('My shortlist (1)')).toBeVisible();

  // removing it from the card puts the popup's button back to Save
  await card.getByRole('button', { name: /^Saved .* \(press to remove\)$/ }).click();
  await expect(popup.getByRole('button', { name: /^Save .* to shortlist$/ })).toBeVisible();
  await expect(page.getByText('My shortlist (0)')).toBeVisible();
});

test('should ask a visitor without an account to log in from the dot popup', async ({ page }) => {
  // setup: as a visitor, search a postal code that has exactly one flat, and open it on the map
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await page.getByRole('button', { name: 'Show on map' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  const popup = page.locator('.leaflet-popup');
  await expect(popup.getByText('Blk 672A YISHUN AVE 4')).toBeVisible();
  await expect(popup.getByRole('link', { name: 'create a free account' })).not.toBeVisible();

  // actions
  await popup.getByRole('button', { name: /^Save .* to shortlist$/ }).click();

  // assert: the popup asks them to log in (and the link opens the Create account page), and nothing is saved
  await expect(popup.getByRole('link', { name: 'create a free account' })).toBeVisible();
  await expect(popup.getByRole('button', { name: /^Save .* to shortlist$/ })).toBeVisible();
  await popup.getByRole('link', { name: 'create a free account' }).click();
  await expect(page).toHaveURL(/\/createaccount/);
});
