import { describe, it, expect } from "vitest";
import { CATEGORIES, categoryScore, personalScore } from "./score.js";

const cat = (id) => CATEGORIES.find((c) => c.id === id);

const block = {
  nearestMrt: { name: "Bishan", walkMinutes: 3 },
  amenityAccess: { school: 300, park: 1000, hawker: 675, healthcare: null, eldercare: 5000 },
};

describe("categoryScore", () => {
  it("is 100 at the best distance and 0 at the worst", () => {
    expect(categoryScore(cat("transport"), block)).toBe(100);    // 3 min = best
    expect(categoryScore(cat("greenery"), block)).toBe(0);       // 1000 m = worst
  });

  it("stays at 100 when closer than best, and 0 when further than worst (never above or below)", () => {
    expect(categoryScore(cat("transport"), { nearestMrt: { walkMinutes: 1 } })).toBe(100);
    expect(categoryScore(cat("eldercare"), block)).toBe(0);      // 5000 m, worst is 1500
  });

  it("falls in a straight line in between", () => {
    expect(categoryScore(cat("food"), block)).toBe(50);          // 675 m is halfway between 150 and 1200
    expect(categoryScore(cat("transport"), { nearestMrt: { walkMinutes: 11.5 } })).toBe(50);
  });

  it("reads minutes for transport and metres for the rest", () => {
    expect(categoryScore(cat("schools"), block)).toBe(100);      // 300 m = best
  });

  it("is null — not 0 — when there is no data", () => {
    expect(categoryScore(cat("healthcare"), block)).toBeNull();           // value is null
    expect(categoryScore(cat("transport"), { nearestMrt: null })).toBeNull();
    expect(categoryScore(cat("greenery"), {})).toBeNull();                 // no amenityAccess at all
  });
});

describe("personalScore", () => {
  it("is the weighted average of the categories the buyer cares about", () => {
    // transport 100 (weight 3), food 50 (weight 1) → (300 + 50) / 4 = 87.5 → 88
    expect(personalScore(block, { transport: 3, food: 1 })).toBe(88);
  });

  it("ignores categories with weight zero", () => {
    expect(personalScore(block, { transport: 1, greenery: 0 })).toBe(100);
  });

  it("leaves out categories with no data AND their weight, instead of counting them as zero", () => {
    // healthcare has no data. The score must be transport's 100, not dragged down.
    expect(personalScore(block, { transport: 1, healthcare: 9 })).toBe(100);
  });

  it("is null when nothing weighted has data, or nothing is weighted", () => {
    expect(personalScore(block, { healthcare: 5 })).toBeNull();
    expect(personalScore(block, {})).toBeNull();
    expect(personalScore(block, { transport: 0 })).toBeNull();
  });

  it("moves the right way when a priority changes", () => {
    const near = { nearestMrt: { walkMinutes: 4 }, amenityAccess: { park: 900 } };
    const far  = { nearestMrt: { walkMinutes: 15 }, amenityAccess: { park: 150 } };
    const commuter = { transport: 9, greenery: 1 };
    const walker = { transport: 1, greenery: 9 };
    expect(personalScore(near, commuter)).toBeGreaterThan(personalScore(far, commuter));
    expect(personalScore(far, walker)).toBeGreaterThan(personalScore(near, walker));
  });

  it("returns a whole number", () => {
    expect(Number.isInteger(personalScore(block, { transport: 2, food: 3, schools: 1 }))).toBe(true);
  });
});
