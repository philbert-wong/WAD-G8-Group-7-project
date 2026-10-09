import { describe, it, expect } from "vitest";
import { categoryScore, personalScore, hasWeights } from "../../client/src/lib/score.js";
import { SCORE_CATEGORIES } from "../../client/src/lib/constants.js";

const cat = (id) => SCORE_CATEGORIES.find((c) => c.id === id);

const block = {
  nearestMrt: { name: "Bishan", walkMinutes: 3 },
  amenityAccess: { school: 300, park: 1000, hawker: 675, healthcare: null, eldercare: 5000 },
};

describe("categoryScore", () => {
  it("is 100 at or inside the best distance and 0 at or beyond the worst", () => {
    expect(categoryScore(cat("transport"), block)).toBe(100);       // 3 min, best is 3
    expect(categoryScore(cat("greenery"), block)).toBe(0);          // 1000 m, worst is 1000
    expect(categoryScore(cat("eldercare"), block)).toBe(0);         // way past worst
  });

  it("falls in a straight line between the two", () => {
    // hawker: best 150, worst 1200, so 675 m is exactly halfway
    expect(categoryScore(cat("food"), block)).toBe(50);
  });

  it("is null when there is no data, never zero", () => {
    expect(categoryScore(cat("healthcare"), block)).toBeNull();
    expect(categoryScore(cat("transport"), { nearestMrt: null })).toBeNull();
  });
});

describe("personalScore", () => {
  it("is the weighted average of the categories the buyer cares about", () => {
    // transport 100 (w3) and food 50 (w1) → (300 + 50) / 4 = 87.5
    expect(personalScore(block, { transport: 3, food: 1 })).toBe(88);
  });

  it("ignores categories with weight zero", () => {
    expect(personalScore(block, { transport: 1, greenery: 0 })).toBe(100);
  });

  it("renormalises over categories that have data instead of counting gaps as zero", () => {
    // healthcare has no data, so it must not drag the score down
    expect(personalScore(block, { transport: 1, healthcare: 9 })).toBe(100);
  });

  it("is null when nothing weighted has data, or nothing is weighted", () => {
    expect(personalScore(block, { healthcare: 5 })).toBeNull();
    expect(personalScore(block, {})).toBeNull();
  });

  it("moves the right way when a priority changes", () => {
    const near = { nearestMrt: { walkMinutes: 4 }, amenityAccess: { park: 900 } };
    const far  = { nearestMrt: { walkMinutes: 15 }, amenityAccess: { park: 150 } };
    const commuter = { transport: 9, greenery: 1 };
    const walker = { transport: 1, greenery: 9 };
    expect(personalScore(near, commuter)).toBeGreaterThan(personalScore(far, commuter));
    expect(personalScore(far, walker)).toBeGreaterThan(personalScore(near, walker));
  });
});

describe("hasWeights", () => {
  it("is true only if some slider is above zero", () => {
    expect(hasWeights({ transport: 0, food: 0 })).toBe(false);
    expect(hasWeights({ transport: 0, food: 2 })).toBe(true);
    expect(hasWeights(undefined)).toBe(false);
  });
});
