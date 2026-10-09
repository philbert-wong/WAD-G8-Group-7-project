/**
 * EXERCISE 2 — turn URL filters into a MongoDB query
 * ───────────────────────────────────────────────────
 * GOAL
 *   The browser asks:   /api/listings?flatType=4%20ROOM&maxPrice=600000&minLease=60
 *   Express hands you:  { flatType: "4 ROOM", maxPrice: "600000", minLease: "60" }
 *   You build the object MongoDB needs to find matching blocks.
 *
 * !! EVERY VALUE IN `query` IS A STRING — even numbers. "600000" is not 600000.
 *    MongoDB compares numbers with numbers, so convert with Number(...).
 *
 * RETURN
 *   { filter, limit, maxPriceAfterShaping }
 *     filter                → what you'd pass to Block.find(filter)
 *     limit                 → the most blocks to return
 *     maxPriceAfterShaping  → a number, or null (see step 8)
 *
 * RUN THE TESTS
 *   npx vitest run my-work/exercises/2-listings-filter
 *   The test names read like a checklist of the steps below.
 *
 * ── STEPS TO WRITE (do one, run the tests, then the next) ────────────────
 *
 *   0. HELPER FIRST. Write a tiny function that turns a query value into a
 *      number, or null if it is missing / empty / not a number:
 *          "600000" → 600000     ""  → null     "abc" → null     undefined → null
 *      Careful: Number("") is 0, and Number("abc") is NaN. Use
 *      Number.isFinite(x) to check. You'll use this helper everywhere below.
 *
 *   1. START the filter with the one rule that is always true:
 *          "location.coordinates" must NOT equal [0, 0]
 *      In MongoDB:   { "location.coordinates": { $ne: [0, 0] } }
 *      Why: [0, 0] is the marker for "this block hasn't been geocoded yet".
 *
 *   2. NEAR-A-POINT SEARCH. Read lat, lng and radius as numbers (use the helper).
 *      It is a "near" search ONLY IF all three exist AND radius is above 0.
 *      Then add this to the filter:
 *          filter.location = {
 *            $near: {
 *              $geometry: { type: "Point", coordinates: [ ...lng FIRST, then lat... ] },
 *              $maxDistance: radius
 *            }
 *          }
 *      !! GeoJSON order is [longitude, latitude] — NOT [lat, lng]. Getting this
 *         backwards puts every flat off the coast of Africa. A test checks it.
 *
 *   3. LIMIT. A near search returns at most NEAR_CAP (300). Anything else is a
 *      whole-island search and returns at most ISLAND_CAP (12000).
 *      Both constants are already defined for you at the top of the file.
 *
 *   4. TOWN. If query.town is given: filter.town = the town in UPPERCASE.
 *      ("bishan" → "BISHAN"; the database stores towns in capitals.)
 *
 *   5. MINIMUM LEASE. If minLease is a number:
 *          filter.remainingLeaseYears = { $gte: minLease }      ($gte = ≥)
 *
 *   6. MAX WALK TO MRT. If maxWalkMin is a number:
 *          filter["nearestMrt.walkMinutes"] = { $lte: maxWalkMin }   ($lte = ≤)
 *
 *   7. FLAT TYPE. If query.flatType is given (e.g. "4 ROOM"), the block must
 *      have sold that type. Blocks store stats per type, so the field name is
 *      built from the type — use a template string:
 *          filter[`stats.${flatType}`] = { $exists: true }
 *
 *   8. MAX PRICE — two cases:
 *        a) flatType AND maxPrice both given → the database can check it:
 *               filter[`stats.${flatType}.medianPrice`] = { $lte: maxPrice }
 *        b) maxPrice but NO flatType → the database can't, because "the price"
 *           depends on which flat type you pick (see server/lib/toApiShape.js).
 *           Don't add anything to filter. Instead hand the number back as
 *           maxPriceAfterShaping so the route can filter it later.
 *        In every other case maxPriceAfterShaping is null.
 *
 *   9. RETURN { filter, limit, maxPriceAfterShaping }.
 *
 * ── RULES TO REMEMBER ────────────────────────────────────────────────────
 *   • Missing, empty or non-numeric values are simply IGNORED. Never put NaN
 *     or null into the filter — the last two tests check for this.
 *   • Build the filter one `if` at a time. Don't try to write it in one go.
 *
 * ── WHEN THE TESTS PASS ──────────────────────────────────────────────────
 *   Copy this file to server/lib/listingsFilter.js, then replace the inline
 *   filter-building in server/routes/listings.js with a call to your function.
 *   Check that  curl "localhost:3000/api/listings?flatType=4%20ROOM"  still works
 *   and  npm run test:unit  still passes.
 */
export const NEAR_CAP = 300;
export const ISLAND_CAP = 12000;

export function buildListingsFilter(query) {
  // TODO: write steps 0–9 here, then delete the line below.
  throw new Error("Not written yet");
}
