// price-details.spec.js
// E2E journey: a visitor opens the price details of a flat (its recent sales and the price trend chart).
// Every test has 3 stages: (1) setup, (2) actions, (3) assert.
// 761672 is Blk 672A Yishun Ave 4: it has exactly one flat in the seed data, so there is only one card.
import { test, expect } from '@playwright/test';

test('should show the price details of a flat when the button is clicked', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Price details' }).click();

  // assert: the price figures and the chart section appear, and the button now offers to hide them
  await expect(page.getByText('Median price per m²')).toBeVisible();
  await expect(page.getByText('Price trend since 2021')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide price details' })).toBeVisible();
});

test('should hide the price details again when the button is clicked twice', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await page.getByRole('button', { name: 'Price details' }).click();
  await expect(page.getByText('Price trend since 2021')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Hide price details' }).click();

  // assert
  await expect(page.getByText('Price trend since 2021')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Price details' })).toBeVisible();
});
