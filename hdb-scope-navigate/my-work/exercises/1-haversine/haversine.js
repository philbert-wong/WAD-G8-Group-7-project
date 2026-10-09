/**
 * EXERCISE 1 — distance between two points
 * ─────────────────────────────────────────
 * GOAL
 *   Given two places on a map, return how far apart they are in METRES,
 *   measured in a straight line over the Earth's surface.
 *
 * INPUT
 *   a and b are objects like { lat: 1.3700, lng: 103.8495 }  (degrees)
 *
 * OUTPUT
 *   A number of metres, e.g. 2090 for Ang Mo Kio MRT → Bishan MRT.
 *
 * RUN THE TESTS
 *   npx vitest run my-work/exercises/1-haversine
 *   Start with the first failing test and make it pass, then the next.
 *
 * ── THE FORMULA ──────────────────────────────────────────────────────────
 *   dLat = lat2 − lat1                     (radians)
 *   dLng = lng2 − lng1                     (radians)
 *   h    = sin²(dLat / 2)  +  cos(lat1) × cos(lat2) × sin²(dLng / 2)
 *   distance = 2 × R × asin( √h )          where R = 6,371,000 metres
 *
 * ── STEPS TO WRITE ───────────────────────────────────────────────────────
 *   1. Make a constant for the Earth's radius: 6371000.
 *
 *   2. Make a small helper that converts DEGREES to RADIANS.
 *        Math.sin / Math.cos / Math.asin all work in radians, not degrees.
 *        radians = degrees × Math.PI / 180
 *
 *   3. Work out dLat:  convert (b.lat − a.lat) to radians.
 *      Work out dLng:  convert (b.lng − a.lng) to radians.
 *
 *   4. Work out h using the formula above.
 *        - Math.sin(x) ** 2   squares the sine
 *        - You need the cosine of each point's LATITUDE (converted to radians first)
 *
 *   5. Return 2 × R × Math.asin(Math.sqrt(h)).
 *
 * ── CHECK AS YOU GO ──────────────────────────────────────────────────────
 *   • Same point twice → h is 0, so the answer is exactly 0.
 *   • One degree of latitude is about 111,000 m — a good sanity check.
 *   • Swapping a and b must give the same answer.
 *   • If you get a tiny number like 0.0003, you forgot to convert to radians.
 *   • If you get a number ~1000× too small, your R is in km, not metres.
 */
export function haversineM(a, b) {
  // TODO: write steps 1–5 here, then delete the line below.
  throw new Error("Not written yet");
}
