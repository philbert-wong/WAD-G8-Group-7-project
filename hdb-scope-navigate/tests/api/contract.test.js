/**
 * SKELETON — the API contract as an automatic check.  OWNER: me (API contract + integration)
 * ─────────────────────────────────────────────────────────────────────
 * WHY
 *   The README lists what each endpoint returns, and tests/unit/toApiShape.test.js
 *   guards the shape of ONE block. But nothing checks that the real HTTP response
 *   matches. This closes the gap — it is the test that stops the frontend and
 *   backend silently drifting apart.
 *
 * IDEA
 *   Call each endpoint with supertest and assert the response has EXACTLY the
 *   fields the contract promises — no missing field, no surprise extra.
 *
 *   const BLOCK_FIELDS = [ "amenityAccess", "block", "id", "lat", "lng", "medianPrice",
 *     "medianPsm", "nearestMrt", "remainingLeaseYears", "streetName", "town", "txnCount" ];
 *   expect(Object.keys(res.body.blocks[0]).sort()).toEqual(BLOCK_FIELDS);
 *
 * Needs createApp.js + setup.js like the other API tests.
 */
import { describe, it } from "vitest";

describe("API contract", () => {
  it.todo("GET /api/listings → { count, blocks: [ the agreed block fields ] }");
  it.todo("a block's nearestMrt in a listing has only { name, walkMinutes }");
  it.todo("GET /api/blocks/:id → the listing fields PLUS transactions and statsByType");
  it.todo("GET /api/amenities → { amenities: [ { id, type, name, lat, lng } ] }");
  it.todo("GET /api/health → { ok: true }");
  it.todo("errors are always { error: \"a sentence\" } — never a stack trace");
});
