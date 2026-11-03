// calculator.spec.js
// E2E journey: the Proximity Housing Grant (PHG) checker on the calculator page (Step 2).
// A visitor types their parents' postal code and sees the blocks within 4 km, a page at a time.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert. See auth.spec.js for why the setup closes the
// first-visit popup and the page tour. The calculator has a tour of its own the first time it is opened.
// The checker only appears when "Will live NEAR them" is chosen in Step 1.
// (The postal code is looked up by OneMap, so these tests need the OneMap login in server/config.env.)
import { test, expect } from '@playwright/test';

test('should list the blocks near the parents a page at a time', async ({ page }) => {
  // setup: open the calculator, give an income, choose "near parents", and go to Step 2
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.locator('#cal-income-0').fill('4000');
  await page.locator('#cal-phg').selectOption('near');
  await page.getByRole('button', { name: 'Next' }).click();

  // actions
  await page.locator('#phg-parent').fill('530959');
  await page.getByRole('button', { name: 'Check PHG' }).click();

  // assert: 50 blocks (the most the server sends) in pages of 10 is 5 pages: the first page, then the second
  // (on a phone the pages are shorter: see mobile/phg-mobile.spec.js)
  await expect(page.getByText('flat(s) within 4 km qualify')).toBeVisible();
  await expect(page.getByText('Page 1 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 5')).toBeVisible();
});

test('should say so when the postal code or address cannot be found', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.locator('#cal-income-0').fill('4000');
  await page.locator('#cal-phg').selectOption('near');
  await page.getByRole('button', { name: 'Next' }).click();

  // actions
  await page.locator('#phg-parent').fill('zzzzqqqq');
  await page.getByRole('button', { name: 'Check PHG' }).click();

  // assert
  await expect(page.getByText('We could not find "zzzzqqqq"')).toBeVisible();
});

test('should ask for a postal code when the box is empty', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.locator('#cal-income-0').fill('4000');
  await page.locator('#cal-phg').selectOption('near');
  await page.getByRole('button', { name: 'Next' }).click();

  // actions
  await page.getByRole('button', { name: 'Check PHG' }).click();

  // assert
  await expect(page.getByText("Please type your parents' postal code or address first")).toBeVisible();
});
