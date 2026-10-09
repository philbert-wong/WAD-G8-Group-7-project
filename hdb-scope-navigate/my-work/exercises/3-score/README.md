# Exercise 3 — the personal score

**Make:** `categoryScore` and `personalScore` in [`score.js`](score.js).
**Real version, for after:** [`client/src/lib/score.js`](../../../client/src/lib/score.js)

A buyer says how much each thing matters (a **weight**, 0–10). Every block gets a 0–100
score showing how well it fits.

## Step 1 — one category → 0 to 100
Each category has a `best` and a `worst` distance (in the `CATEGORIES` list in the stub).

- at or closer than `best` → **100**
- at or further than `worst` → **0**
- in between → a straight line

Example: food has `best: 150`, `worst: 1200`. A hawker centre at 675 m is exactly halfway → **50**.

The number comes from the block: for `transport` it is `block.nearestMrt.walkMinutes`; for
the others it is `block.amenityAccess[category.amenity]` (metres). If the number is
missing, return **`null`** — *not* 0. "We don't know" is not the same as "it's terrible".

## Step 2 — all categories → one score
Weighted average of the categories the buyer cares about:

```
score = (w1·s1 + w2·s2 + …) / (w1 + w2 + …)
```
- Skip categories with weight 0.
- Skip categories where `categoryScore` is `null` — **and don't count their weight** in the
  bottom of the fraction. (Otherwise a block with missing data is punished unfairly.)
- Round to a whole number.
- If nothing is left to average, return `null`.

## Hints
- `Math.min(1, Math.max(0, x))` clamps `x` between 0 and 1.
- Work it as: `t = (value − best) / (worst − best)`, clamp `t`, then `score = 100 × (1 − t)`.
- Write step 1 first and get those tests green before starting step 2.

## Done when
`npx vitest run my-work/exercises/3-score` is green.

## After — the design question
Right now the app runs this in the **browser** so sliders respond instantly. Your role says
"personalised score computation" is back-end. Which is better, and why? Consider:
- 10,000 blocks × a slider drag = how many requests, if the server did it?
- What would a server version be good for that the browser can't do? (Sorting and paging a big result? Hiding the formula?)
Write your answer in two sentences in `my-work/checklist.md`.
