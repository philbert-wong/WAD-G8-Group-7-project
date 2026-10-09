/**
 * EXERCISE 3 — the personal score
 * ────────────────────────────────
 * GOAL
 *   A buyer says how much each thing matters to them (a "weight" from 0 to 10).
 *   Give every block a score from 0 to 100 showing how well it fits.
 *
 * RUN THE TESTS
 *   npx vitest run my-work/exercises/3-score
 *   Do PART A first and get its tests green before starting PART B.
 */

// Given — don't change. `best` and `worst` are MINUTES for transport and
// METRES for everything else.
export const CATEGORIES = [
  { id: "transport",  source: "mrt",        best: 3,   worst: 20 },
  { id: "food",       amenity: "hawker",     best: 150, worst: 1200 },
  { id: "greenery",   amenity: "park",       best: 150, worst: 1000 },
  { id: "healthcare", amenity: "healthcare", best: 200, worst: 1200 },
  { id: "schools",    amenity: "school",     best: 300, worst: 2000 },
  { id: "eldercare",  amenity: "eldercare",  best: 300, worst: 1500 },
];

/**
 * ═════════════ PART A — ONE CATEGORY → 0 to 100 ═════════════
 *
 * INPUT   category: one item from CATEGORIES above
 *         block:    a block, e.g.
 *           { nearestMrt: { walkMinutes: 6 },
 *             amenityAccess: { hawker: 675, park: 300, school: 800, ... } }
 *
 * IDEA    Closer is better.
 *           at or closer than `best`   → 100
 *           at or further than `worst` → 0
 *           in between                 → a straight line
 *         Example: food has best 150, worst 1200. A hawker centre at 675 m is
 *         exactly halfway, so the score is 50.
 *
 * STEPS
 *   1. Find the block's value for this category:
 *        • if category.source is "mrt"  → block.nearestMrt.walkMinutes
 *        • otherwise                    → block.amenityAccess[category.amenity]
 *      Use optional chaining (?.) because nearestMrt or amenityAccess may be
 *      missing altogether: block.nearestMrt?.walkMinutes
 *
 *   2. If the value is missing (null / undefined) → return null.
 *      !! NOT 0. "We don't know" is not "it's terrible". A test checks this.
 *
 *   3. Work out how far along the scale it is, from 0 (at best) to 1 (at worst):
 *          t = (value − best) / (worst − best)
 *
 *   4. CLAMP t between 0 and 1, so being closer than `best` gives 0 and further
 *      than `worst` gives 1 (never below 0 or above 1):
 *          Math.min(1, Math.max(0, t))
 *
 *   5. Flip it (closer = higher) and scale to 100, rounded to a whole number:
 *          Math.round(100 × (1 − t))
 */
export function categoryScore(category, block) {
  // TODO: write steps 1–5, then delete the line below.
  throw new Error("Not written yet");
}

/**
 * ═════════════ PART B — ALL CATEGORIES → ONE SCORE ═════════════
 *
 * INPUT   block:   as above
 *         weights: how much the buyer cares, e.g.
 *                  { transport: 5, food: 3, greenery: 0, healthcare: 2 }
 *
 * IDEA    A weighted average — more important categories count for more:
 *             score = (w1×s1 + w2×s2 + …) ÷ (w1 + w2 + …)
 *         where s = that category's score from Part A and w = its weight.
 *
 * WORKED EXAMPLE
 *   transport scores 100 with weight 3, food scores 50 with weight 1:
 *       (3×100 + 1×50) ÷ (3 + 1) = 350 ÷ 4 = 87.5  → rounds to 88
 *
 * STEPS
 *   1. Make two running totals, both starting at 0:
 *        sum    — adds up  weight × score
 *        total  — adds up  weight
 *
 *   2. Loop over every category in CATEGORIES. For each one:
 *        a. Get its weight:  Number(weights?.[category.id]) || 0
 *           (the `|| 0` turns undefined / NaN into 0)
 *        b. If the weight is 0 or less → skip it (`continue`).
 *        c. Get its score with categoryScore(category, block).
 *        d. If the score is null → skip it too.
 *           !! Skip its WEIGHT as well: don't add it to `total`. Otherwise a
 *              block with missing data gets unfairly dragged down. A test
 *              checks this exact case.
 *        e. Otherwise: sum += weight × score;  total += weight.
 *
 *   3. If total is still 0 (nothing was weighted, or nothing had data)
 *      → return null.  Don't divide by zero.
 *
 *   4. Otherwise return Math.round(sum / total).
 */
export function personalScore(block, weights) {
  // TODO: write steps 1–4, then delete the line below.
  throw new Error("Not written yet");
}
