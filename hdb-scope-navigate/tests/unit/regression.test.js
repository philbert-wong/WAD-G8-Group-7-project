import { describe, it, expect } from "vitest";
import { fitOls, correlation } from "../../server/lib/regression.js";

describe("fitOls", () => {
  it("recovers an exact linear relationship", () => {
    // y = 5 + 2a − 3b
    const X = [[1, 0], [2, 1], [3, 5], [4, 2], [5, 9], [6, 3]];
    const y = X.map(([a, b]) => 5 + 2 * a - 3 * b);
    const fit = fitOls(X, y);
    expect(fit.intercept).toBeCloseTo(5, 4);
    expect(fit.coefficients[0]).toBeCloseTo(2, 4);
    expect(fit.coefficients[1]).toBeCloseTo(-3, 4);
    expect(fit.r2).toBeCloseTo(1, 6);
  });

  it("works in original units even when columns are on very different scales", () => {
    // price in dollars vs year: the case the trend model actually hits
    const X = [[2022.1, 90], [2023.4, 92], [2024.2, 91], [2025.7, 93], [2026.3, 90], [2023.9, 92]];
    const y = X.map(([t, a]) => 400000 + 12000 * (t - 2022) + 1000 * a);
    const fit = fitOls(X, y);
    expect(fit.coefficients[0]).toBeCloseTo(12000, 0);
  });

  it("drops a column with no variation instead of failing", () => {
    const X = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]];
    const y = [3, 5, 7, 9, 11];
    const fit = fitOls(X, y);
    expect(fit.dropped).toEqual([1]);
    expect(fit.coefficients[1]).toBe(0);
    expect(fit.coefficients[0]).toBeCloseTo(2, 4);
  });

  it("survives perfectly collinear columns", () => {
    const X = [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12]];
    const y = [2, 4, 6, 8, 10, 12];
    const fit = fitOls(X, y);
    expect(fit).not.toBeNull();
    expect(fit.r2).toBeGreaterThan(0.999);
  });

  it("returns null when there are too few rows", () => {
    expect(fitOls([[1, 2], [2, 3]], [1, 2])).toBeNull();
    expect(fitOls([], [])).toBeNull();
  });

  it("reports a low R² for noise", () => {
    const X = Array.from({ length: 40 }, (_, i) => [i]);
    const y = Array.from({ length: 40 }, (_, i) => (i * 7919) % 13);
    expect(fitOls(X, y).r2).toBeLessThan(0.3);
  });
});

describe("correlation", () => {
  it("is 1 for a straight line and 0 for a constant", () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(correlation([1, 2, 3], [5, 5, 5])).toBe(0);
  });
});
