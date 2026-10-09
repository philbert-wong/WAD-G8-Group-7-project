/**
 * SKELETON — GET /api/blocks/:id.  OWNER: me (test setup)
 * Same setup as listings.test.js (createApp + startTestDb + seedBlocks).
 *
 * Tip: seedBlocks() returns the created blocks, so you can read a real id from
 * them:  const [amk] = await seedBlocks();   then   request(app).get(`/api/blocks/${amk._id}`)
 */
import { describe, it } from "vitest";

describe("GET /api/blocks/:id", () => {
  it.todo("returns the block with its transactions and per-flat-type stats");
  it.todo("returns the walking route as plain [lat, lng] pairs, or null if there is none");
  it.todo("404 with a clear message for an id that doesn't exist");
  it.todo("what happens for an id that isn't a valid ObjectId at all? (it is currently a 500 — should it be a 400 or 404?)");
});
