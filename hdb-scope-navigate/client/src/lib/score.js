import { SCORE_CATEGORIES } from "./constants.js";

/**
 * The personal score. Pure functions, so the maths is testable and the sliders
 * can recompute every block on every drag without a server round trip.
 * OWNER: Frontend — Shell & UI
 */

/** The raw number a category reads off a block (minutes or metres), or null. */
export function rawValue(cat, block) {
  const v = cat.source === "mrt" ? block.nearestMrt?.walkMinutes : block.amenityAccess?.[cat.amenity];
  return v == null || !Number.isFinite(v) ? null : v;
}

/** 0–100 for one category: 100 at `best` or closer, 0 at `worst` or further. */
export function categoryScore(cat, block) {
  const v = rawValue(cat, block);
  if (v == null) return null;
  const t = (v - cat.best) / (cat.worst - cat.best);
  return Math.round(100 * (1 - Math.min(1, Math.max(0, t))));
}

/**
 * Weighted average of the categories the buyer cares about (weight > 0).
 * Categories we have no data for are left out and the rest renormalised, rather
 * than counting as zero. Returns null when no weighted category has data.
 */
export function personalScore(block, weights) {
  let sum = 0, total = 0;
  for (const cat of SCORE_CATEGORIES) {
    const w = Number(weights?.[cat.id]) || 0;
    if (w <= 0) continue;
    const s = categoryScore(cat, block);
    if (s == null) continue;
    sum += w * s;
    total += w;
  }
  return total ? Math.round(sum / total) : null;
}

/** Does the buyer want a score at all? True when any slider is above zero. */
export const hasWeights = (weights) => SCORE_CATEGORIES.some((c) => Number(weights?.[c.id]) > 0);
