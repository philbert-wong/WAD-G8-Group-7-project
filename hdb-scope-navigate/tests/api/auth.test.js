/**
 * SKELETON — register and sign in.  OWNER: me (test setup)
 *
 * These need JWT_SECRET to be set, or signing a token fails. In the test setup set it:
 *     process.env.JWT_SECRET = "test-secret";
 * (before createApp is used)
 * Also add User (and Shortlist) to resetTestDb() so tests don't leak into each other.
 */
import { describe, it } from "vitest";

describe("POST /api/auth/register", () => {
  it.todo("creates an account and returns a token and the email");
  it.todo("400 if the email or password is missing");
  it.todo("400 if the password is under 8 characters");
  it.todo("409 if the email is already registered");
  it.todo("never returns the password or its hash");
});

describe("POST /api/auth/login", () => {
  it.todo("returns a token for the right password");
  it.todo("401 for the wrong password");
  it.todo("401 with the SAME message for an unknown email (so you can't discover who is registered)");
});

describe("protected routes", () => {
  it.todo("GET /api/shortlist without a token → 401");
  it.todo("GET /api/shortlist with a garbage token → 401");
  it.todo("a user can't read or delete another user's shortlist row");
});
