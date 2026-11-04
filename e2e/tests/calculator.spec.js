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

test('should work out a max flat price and send the budget to Search', async ({ page }) => {
  // setup: open the calculator
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions: Step 1 (household), Step 2 (grants), Step 3 (max flat price), then use it on Search
  await page.locator('#cal-income-0').fill('4000');
  await page.locator('#cal-cpf-0').fill('50000');
  await page.locator('#cal-cash-0').fill('20000');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 2: Estimated housing grants')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 3: Your max flat price')).toBeVisible();
  await page.getByRole('button', { name: 'Apply Budget to Search' }).click();

  // assert: the Search page opens and shows flats that fit the budget
  await expect(page.getByText('Homes that fit')).toBeVisible();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
});

test('should ask for an income before working anything out', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions: go on without typing an income
  await page.getByRole('button', { name: 'Next' }).click();

  // assert: the form says what is missing, and stays on Step 1
  await expect(page.getByText('Please enter the monthly income')).toBeVisible();
  await expect(page.getByText('Step 1: Household finances')).toBeVisible();
});

test('should remember the household details of a logged-in user', async ({ page }) => {
  // setup: create an account and fill in the calculator (each box is saved when the user leaves it)
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
  await page.getByRole('link', { name: 'Affordability' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.locator('#cal-income-0').fill('4000');
  await page.locator('#cal-cpf-0').fill('50000');
  await page.locator('#cal-cash-0').fill('20000');
  await page.locator('#cal-cash-0').press('Tab');

  // actions: leave the calculator for Search (which takes a moment to load), then come back
  await page.getByRole('link', { name: 'Search' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('link', { name: 'Affordability' }).click();

  // assert: the income is still there, so Step 2 works out the grants with it
  await expect(page.locator('#cal-income-0')).toHaveValue('4000');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Household monthly income: $4,000')).toBeVisible();
});

