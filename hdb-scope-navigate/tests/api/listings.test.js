/**
 * SKELETON — GET /api/listings.  OWNER: me (test setup)
 * `it.todo(...)` shows as "pending", not failing. Turn each into a real `it(...)`.
 *
 * START HERE (needs server/createApp.js and tests/api/setup.js first):
 *
 *   import { describe, it, expect, beforeAll, afterAll } from "vitest";
 *   import request from "supertest";
 *   import { createApp } from "../../server/createApp.js";
 *   import { startTestDb, stopTestDb, seedBlocks } from "./setup.js";
 *
 *   const app = createApp();
 *   beforeAll(async () => { await startTestDb(); await seedBlocks(); }, 120000);
 *   afterAll(stopTestDb);
 *
 *   it("returns every block when no filter is given", async () => {
 *     const res = await request(app).get("/api/listings");
 *     expect(res.status).toBe(200);
 *     expect(res.body.count).toBe(3);
 *   });
 *
 * (the long timeout on beforeAll is for the first-ever MongoDB download)
 */
import { describe, it } from "vitest";

describe("GET /api/listings", () => {
  describe("whole-island search", () => {
    it.todo("returns every geocoded block when there are no filters");
    it.todo("leaves out blocks that have not been geocoded (coordinates [0, 0])");
    it.todo("returns the response shape the contract promises (see contract.test.js)");
  });

  describe("near-a-point search", () => {
    it.todo("returns only blocks within the radius");
    it.todo("returns them nearest first");
    it.todo("treats radius=0 as a whole-island search");
    it.todo("never returns more than 300 blocks");
  });

  describe("filters", () => {
    it.todo("flatType: only blocks that have sold that type");
    it.todo("maxPrice with flatType: only blocks whose median for that type is at or under it");
    it.todo("maxPrice without flatType: still filters, using the block's headline price");
    it.todo("minLease: only blocks with at least that many years left");
    it.todo("maxWalkMin: only blocks within that walk of an MRT");
    it.todo("town: case-insensitive");
    it.todo("combining several filters narrows the result");
    it.todo("a filter that matches nothing returns count 0 and an empty list, not an error");
  });

  describe("bad input (needs server/middleware/validate.js)", () => {
    it.todo("maxPrice=banana → 400 with a message naming maxPrice");
    it.todo("lat without lng → 400");
    it.todo("lat=500 → 400 (not on Earth, let alone Singapore)");
  });
});
