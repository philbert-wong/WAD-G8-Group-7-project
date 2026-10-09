/**
 * SKELETON (optional but good practice) — write this file.  OWNER: me
 * ─────────────────────────────────────────────────────────────────────
 * WHY
 *   Anyone can type  /api/listings?maxPrice=banana  into the address bar.
 *   Right now that either gets quietly ignored or reaches the database.
 *   A well-built API answers bad input with a clear 400 error instead.
 *
 * WHAT
 *   An Express middleware: a function (req, res, next) that runs BEFORE the route.
 *     - if the input is fine  → call next()
 *     - if it's not           → res.status(400).json({ error: "..." }) and STOP (return)
 *
 * STEPS
 *   1. Write validateListingsQuery(req, res, next).
 *   2. For each NUMERIC parameter that is present — lat, lng, radius, maxPrice,
 *      minLease, maxWalkMin — check Number(value) is a finite number.
 *      Missing is fine (they're all optional). Present-but-not-a-number is a 400.
 *   3. Check ranges that make sense for Singapore:
 *        lat between 1.1 and 1.5,  lng between 103.5 and 104.2,
 *        radius between 0 and 20000 (metres),  prices and leases not negative.
 *   4. lat and lng go together: one without the other is a 400.
 *   5. Error messages should say WHICH parameter is wrong:
 *        { error: "maxPrice must be a number" }   — not just "bad request".
 *   6. Use it in server/routes/listings.js:
 *        router.get("/listings", validateListingsQuery, async (req, res, next) => { ... })
 *
 * TESTS to write for it are listed in tests/api/listings.test.js.
 */
export function validateListingsQuery(req, res, next) {
  // TODO: steps 1–5.
  next();   // placeholder: lets everything through until you write it
}
