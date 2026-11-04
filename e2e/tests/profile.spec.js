// profile.spec.js
// E2E journey: the Profile page, where a logged-in user changes their saved answers (town, budget ...).
// Every test has 3 stages: (1) setup: go to the page, (2) actions: what the user does, (3) assert: what the user sees.
// Every test starts in a fresh browser, so the setup closes the first-visit popup and the page tour first.
// A new email is made for each test, so the tests can be run again and again.
import { test, expect } from '@playwright/test';

test('should save new answers on the profile page', async ({ page }) => {
  // setup: create an account (this logs the user in), then open the profile page from the top bar
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
  await page.getByRole('link', { name: 'Your profile' }).click();

  // actions: choose a town and a budget, then save
  await page.locator('#profile-town').selectOption('TAMPINES');
  await page.locator('#profile-budget').fill('600000');
  await page.getByRole('button', { name: 'Save changes' }).click();

  // assert: the page says the answers were saved
  await expect(page.getByText('Saved. Search and the Map now start with these answers')).toBeVisible();
});

test('should send a visitor who is not logged in to the login page', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // actions: try to open the profile page directly
  await page.goto('/profile');

  // assert: the navigation guard sends them to log in first
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
  await expect(page.locator('#login-email')).toBeVisible();
});
