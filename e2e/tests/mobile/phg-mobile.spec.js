// phg-mobile.spec.js
// E2E journey at phone width (the "iphone-6" project in playwright.config.js runs the tests in this folder at 375 x 667).
// The PHG checker on the calculator page shows 5 blocks per page on a phone (10 on a computer), so the list is
// shorter and needs less scrolling. 530959 has 50 or more blocks within 4 km, and the server sends at most 50:
// 50 blocks make 10 pages of 5.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
import { test, expect } from '@playwright/test';

test('should show the blocks near the parents 5 at a time on a phone', async ({ page }) => {
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

  // assert: 50 blocks in pages of 5 is 10 pages, and the next page can be opened
  await expect(page.getByText('Page 1 of 10')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 10')).toBeVisible();
});
