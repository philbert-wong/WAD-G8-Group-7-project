// auth.spec.js
// E2E journey: creating an account and logging in, as a visitor in a real browser.
// Every test has 3 stages: (1) setup: go to the page, (2) actions: what the user does, (3) assert: what the user sees.
// Every test starts in a fresh browser, so the first-visit popup ("What are you looking for?") and the page tour
// always appear first: the setup stage closes them with "Skip for now" and "Skip tour".
// A new email is made for each test (the time plus a random number, so two tests starting together never share one),
// so the tests can be run again and again.
import { test, expect } from '@playwright/test';

test('should create an account and be logged in with a valid email and password', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();

  // actions
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  // every new account answers the 3 security questions (for Forgot password)
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
  await page.locator('#login-confirm').press('Enter');

  // assert
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('should refuse a very common password when creating an account', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();

  // actions
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('password');
  await page.locator('#login-confirm').fill('password');
  // every new account answers the 3 security questions (for Forgot password)
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
  await page.locator('#login-confirm').press('Enter');

  // assert: the server's message is shown, and nobody is logged in
  await expect(page.getByText('That password is too common')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
});

test('should warn when the two passwords do not match', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();

  // actions
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('differentpass456');
  // every new account answers the 3 security questions (for Forgot password)
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
  await page.locator('#login-confirm').press('Enter');

  // assert
  await expect(page.getByText('The two passwords do not match')).toBeVisible();
});

test('should show Wrong email or password when logging in with an unknown account', async ({ page }) => {
  // setup
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  // actions
  await page.locator('#login-email').fill('e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com');
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-password').press('Enter');

  // assert
  await expect(page.getByText('Wrong email or password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
});

test('should ask the next visitor what they are looking for after a logout', async ({ page }) => {
  // setup: create an account, so there is someone to log out
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

  // actions
  await page.getByRole('button', { name: 'Logout' }).click();

  // assert
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible();
});

test('should only reset a forgotten password with the right security answers', async ({ page }) => {
  // setup: create an account (its security answers are Alex, Mrs Tan, KK Hospital), then log out
  const email = 'e2e-' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '@example.com';
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('goodpass123');
  await page.locator('#login-confirm').fill('goodpass123');
  await page.locator('#login-q1').fill('Alex');
  await page.locator('#login-q2').fill('Mrs Tan');
  await page.locator('#login-q3').fill('KK Hospital');
  await page.locator('#login-confirm').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();

  // actions: one wrong answer first, then all 3 right (capitals do not matter)
  // (after a logout the first-visit popup is shown again: close it)
  await page.goto('/forgot-password');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.locator('#forgot-email').fill(email);
  await page.locator('#forgot-q1').fill('alex');
  await page.locator('#forgot-q2').fill('mrs tan');
  await page.locator('#forgot-q3').fill('Wrong Hospital');
  await page.locator('#forgot-password').fill('newpass12345');
  await page.locator('#forgot-confirm').fill('newpass12345');
  await page.getByRole('button', { name: 'Create new password' }).click();
  await expect(page.getByText('The email or one of the answers is not right')).toBeVisible();
  await page.locator('#forgot-q3').fill('kk hospital');
  await page.getByRole('button', { name: 'Create new password' }).click();

  // assert: the Login page says the password was updated, and the new password works
  await expect(page.getByText('Your password was updated')).toBeVisible();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('newpass12345');
  await page.locator('#login-password').press('Enter');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});
