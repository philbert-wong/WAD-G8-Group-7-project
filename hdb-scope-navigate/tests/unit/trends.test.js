import { describe, it, expect } from "vitest";
import {
  saleTime, leaseAtSale, storeyMid, usableRows, fitTrend, fitLeaseModel, MIN_TREND_N,
} from "../../server/lib/trends.js";

describe("helpers", () => {
  it("turns a month into a decimal year", () => {
    expect(saleTime("2026-01")).toBeCloseTo(2026 + 0.5 / 12);
    expect(saleTime("2026-12")).toBeCloseTo(2026 + 11.5 / 12);
  });

  it("works out lease left at the moment of sale", () => {
    const left = leaseAtSale({ month: "2020-07", leaseCommenceYear: 1980 });
    expect(left).toBeCloseTo(99 - 40.54, 1);
  });

  it("never reports a lease outside 0..99", () => {
    expect(leaseAtSale({ month: "2020-01", leaseCommenceYear: 1900 })).toBe(0);
    expect(leaseAtSale({ month: "2020-01", leaseCommenceYear: 2030 })).toBe(99);
  });

  it("takes the middle of a storey range", () => {
    expect(storeyMid("07 TO 09")).toBe(8);
    expect(storeyMid("nonsense")).toBeNull();
  });

  it("drops rows missing a number the models need", () => {
    const good = { month: "2024-03", leaseCommenceYear: 1990, storeyRange: "04 TO 06",
      floorAreaSqm: 90, resalePrice: 500000, pricePsm: 5555, town: "X", flatType: "4 ROOM" };
    expect(usableRows([good, { ...good, storeyRange: "?" }, { ...good, resalePrice: NaN }])).toHaveLength(1);
  });
});

/** Build a synthetic town whose true price rule we know, then check we recover it. */
function synth({ perYear = 12000, perLeaseYear = 2000, n = 160, towns = ["A"], types = ["4 ROOM"] } = {}) {
  let s = 12345;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const year = 2020 + Math.floor(rand() * 6);
    const month = `${year}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}`;
    const commence = 1975 + Math.floor(rand() * 4) * 5;    // four different blocks' leases
    const storey = 1 + Math.floor(rand() * 6) * 3;
    const flatType = types[i % types.length];
    const town = towns[i % towns.length];
    const t = { month, leaseCommenceYear: commence, storeyRange: `${String(storey).padStart(2, "0")} TO ${String(storey + 2).padStart(2, "0")}`,
      floorAreaSqm: 92, town, flatType };
    const lease = leaseAtSale(t);
    t.resalePrice = Math.round(300000 + perYear * (saleTime(month) - 2020) + perLeaseYear * lease
      + 3000 * (storey + 1) + (rand() - 0.5) * 8000);
    t.pricePsm = Math.round(t.resalePrice / 92);
    rows.push(t);
  }
  return rows;
}

describe("fitTrend", () => {
  it("recovers the price change per year", () => {
    const fit = fitTrend(synth({ perYear: 12000 }));
    expect(fit.trendPerYear).toBeGreaterThan(11000);
    expect(fit.trendPerYear).toBeLessThan(13000);
    expect(fit.r2).toBeGreaterThan(0.95);
    expect(fit.leaseControlled).toBe(true);
  });

  it("reports the % change against the recent median price", () => {
    const fit = fitTrend(synth());
    expect(fit.pctPerYear).toBeCloseTo((fit.trendPerYear / fit.medianPrice) * 100, 1);
  });

  it("does not split trend and lease arbitrarily for a single block", () => {
    // One block: lease left is exactly "minus the sale date", so lease must be dropped.
    const one = synth({ n: 60 }).map((t) => ({ ...t, leaseCommenceYear: 1985 }));
    const fit = fitTrend(one);
    expect(fit.leaseControlled).toBe(false);
    expect(fit.controls).not.toContain("remaining lease");
  });

  it("refuses to fit with too little data", () => {
    expect(fitTrend(synth({ n: MIN_TREND_N - 1 }))).toBeNull();
  });
});

describe("fitLeaseModel", () => {
  it("recovers $/sqm per lease year, controlling for town and flat type", () => {
    const rows = synth({ perLeaseYear: 2300, n: 400, towns: ["A", "B", "C"], types: ["3 ROOM", "4 ROOM"] });
    // price per sqm for a 92 sqm flat: 2300 / 92 = 25 per sqm per lease year
    const fit = fitLeaseModel(rows);
    expect(fit.psmPerLeaseYear).toBeGreaterThan(22);
    expect(fit.psmPerLeaseYear).toBeLessThan(28);
    expect(fit.controls).toEqual(expect.arrayContaining(["town", "flat type", "storey"]));
  });

  it("returns a curve that falls as lease shortens, and bins to compare against", () => {
    const fit = fitLeaseModel(synth({ n: 300 }));
    const first = fit.curve[0], last = fit.curve.at(-1);
    expect(first.lease).toBeLessThan(last.lease);
    expect(first.psm).toBeLessThan(last.psm);
    expect(fit.bins.length).toBeGreaterThan(2);
  });
});
