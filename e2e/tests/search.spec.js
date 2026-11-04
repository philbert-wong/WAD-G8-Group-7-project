// search.spec.js
// E2E journey: finding flats with the search box and the filters, as a visitor without an account.
// Every test has 3 stages: (1) setup, (2) actions, (3) assert. See auth.spec.js for why the setup closes the
// first-visit popup and the page tour.
import { test, expect } from '@playwright/test';

test('should show flats when searching for a town', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions
  await page.getByRole('searchbox').fill('Yishun');
  await page.getByRole('button', { name: 'Search' }).click();

  // assert: flats were found, and none of them is from another town
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await expect(page.getByText('WOODLANDS')).not.toBeVisible();
});

test('should show only 4-room flats when the 4-Rm filter is chosen', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions
  await page.getByRole('button', { name: '4-Rm' }).click();

  // assert
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await expect(page.getByText('3 ROOM')).not.toBeVisible();
});

test('should show a clear message when the search matches nothing', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions
  await page.getByRole('searchbox').fill('zzzzqqqq');
  await page.getByRole('button', { name: 'Search' }).click();

  // assert
  await expect(page.getByText('Nothing found for "zzzzqqqq"')).toBeVisible();
});

test('should show the one account message, not two, when a visitor with saved presets tries to save a flat', async ({ page }) => {
  // setup: save the presets in the first-visit popup (that shows the "create an account" message),
  // then search a postal code that has exactly one flat
  await page.goto('/');
  await page.getByRole('button', { name: 'Show me flats' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await expect(page.getByText('to save flats and keep your presets on any device')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();

  // assert: still just the one message (two of them would be a strict-mode error here), and no second one
  await expect(page.getByText('to save flats and keep your presets on any device')).toBeVisible();
  await expect(page.getByText('Saving flats needs an account.')).not.toBeVisible();
});

test('should tell a visitor without an account that saving a flat needs one', async ({ page }) => {
  // setup: search a postal code that has exactly one flat, so there is only one Save button on the page
  // (761672 is Blk 672A Yishun Ave 4, from the seed data)
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  // the page opens with a first search: wait until its result count is shown, so it cannot arrive later and replace ours
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.getByRole('searchbox').fill('761672');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('672A YISHUN AVE 4')).toBeVisible();
  await expect(page.getByText('to save flats and keep your presets on any device')).not.toBeVisible();

  // actions
  await page.getByRole('button', { name: 'Save to Shortlist' }).click();

  // assert: the account message appears, with a way to create an account
  await expect(page.getByText('to save flats and keep your presets on any device')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create a free account' })).toBeVisible();
});

test('should keep the chosen filters after the page is refreshed', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();

  // actions: choose 4-room flats, then refresh the page
  await page.getByRole('button', { name: '4-Rm' }).click();
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await page.reload();

  // assert: 4-room is still the chosen flat type, and no 3-room flat is shown
  await expect(page.getByText('flat(s) match your filters')).toBeVisible();
  await expect(page.getByText('3 ROOM')).not.toBeVisible();
});

test('should use the budget from the calculator once, then take it out of the address', async ({ page }) => {
  // setup: open Search the way the calculator's "Apply budget" button does
  await page.goto('/?maxPrice=500000');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // assert: the budget is applied ...
  await expect(page.getByText('$500,000').first()).toBeVisible();
  // ... and the address no longer has ?maxPrice, so a refresh cannot put an old budget back
  expect(page.url()).not.toContain('maxPrice');
});
