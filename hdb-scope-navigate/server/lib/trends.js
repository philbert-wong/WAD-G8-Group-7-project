import { fitOls, correlation } from "./regression.js";
import { median } from "./stats.js";

/**
 * The two regressions from the proposal:
 *
 *   fitTrend      price      ~ sale date + remaining lease + floor area + storey
 *                 → the coefficient on sale date is the price change in $/year
 *   fitLeaseModel price/sqm  ~ remaining lease + sale date + floor area + storey
 *                            + town + flat type
 *                 → the coefficient on lease is the $/sqm one extra lease year is worth
 *
 * Pure functions over transaction rows. OWNER: Data pipeline & QA
 */

export const MIN_TREND_N = 10;
const LEASE_TERM = 99;

/** "2026-08" → 2026.625 (mid-month, as a decimal year). */
export function saleTime(month) {
  const [y, m] = String(month).split("-").map(Number);
  return y + (m - 0.5) / 12;
}

/**
 * Lease left at the moment of sale. Worked out from the commencement year rather
 * than read from the dataset, so it is consistent for every row.
 */
export function leaseAtSale(t) {
  const left = LEASE_TERM - (saleTime(t.month) - t.leaseCommenceYear);
  return Math.min(LEASE_TERM, Math.max(0, left));
}

/** "07 TO 09" → 8 */
export function storeyMid(range) {
  const m = /(\d+)\s*TO\s*(\d+)/.exec(range || "");
  return m ? (Number(m[1]) + Number(m[2])) / 2 : null;
}

/** Keep only rows that have every number the models need. */
export function usableRows(txns) {
  const rows = [];
  for (const t of txns) {
    const row = {
      time: saleTime(t.month),
      lease: leaseAtSale(t),
      area: Number(t.floorAreaSqm),
      storey: storeyMid(t.storeyRange),
      price: Number(t.resalePrice),
      psm: Number(t.pricePsm),
      month: t.month,
      town: t.town,
      flatType: t.flatType,
    };
    const ok = [row.time, row.lease, row.area, row.storey, row.price, row.psm].every(Number.isFinite)
      && Number.isFinite(t.leaseCommenceYear);
    if (ok) rows.push(row);
  }
  return rows;
}

const round = (n, dp = 0) => (n == null ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/** Median price over the 12 months up to the newest sale in this group. */
function recentMedianPrice(rows) {
  const newest = rows.reduce((m, r) => Math.max(m, r.time), -Infinity);
  const recent = rows.filter((r) => r.time >= newest - 1);
  return median((recent.length >= 3 ? recent : rows).map((r) => r.price));
}

/** Dummy-code `values` against the sorted list of levels, leaving the first out. */
function dummies(values, levels) {
  const used = levels.slice(1);
  return values.map((v) => used.map((l) => (v === l ? 1 : 0)));
}

/**
 * Price trend for one group of transactions (a town + flat type, or a whole flat
 * type with `controlTowns` so town mix doesn't masquerade as a price trend).
 * Returns null if there isn't enough data to fit.
 */
export function fitTrend(txns, { controlTowns = false } = {}) {
  const rows = usableRows(txns);
  if (rows.length < MIN_TREND_N) return null;

  // Inside one block lease left is just "−sale date": the two can't be told apart.
  // When they are that tightly linked we drop lease rather than split the effect
  // arbitrarily, and say so in the result.
  const leaseControlled = Math.abs(correlation(rows.map((r) => r.time), rows.map((r) => r.lease))) < 0.98;

  const towns = [...new Set(rows.map((r) => r.town))].sort();
  const townCols = controlTowns && towns.length > 1 ? dummies(rows.map((r) => r.town), towns) : rows.map(() => []);

  const X = rows.map((r, i) => [r.time, leaseControlled ? r.lease : 0, r.area, r.storey, ...townCols[i]]);
  const fit = fitOls(X, rows.map((r) => r.price));
  if (!fit) return null;

  const medianPrice = recentMedianPrice(rows);
  const perYear = fit.coefficients[0];

  return {
    n: rows.length,
    r2: round(fit.r2, 3),
    trendPerYear: round(perYear),
    pctPerYear: medianPrice ? round((perYear / medianPrice) * 100, 2) : null,
    medianPrice,
    leaseControlled,
    controls: ["sale date", ...(leaseControlled ? ["remaining lease"] : []), "floor area", "storey",
      ...(townCols[0]?.length ? ["town"] : [])],
    coefficients: {
      intercept: round(fit.intercept, 2),
      saleYear: round(fit.coefficients[0], 2),
      leaseYear: round(fit.coefficients[1], 2),
      floorArea: round(fit.coefficients[2], 2),
      storey: round(fit.coefficients[3], 2),
    },
  };
}

/**
 * How much is one more year of remaining lease worth per square metre,
 * holding sale date, size, storey, town and flat type constant?
 * `bins` are the raw medians the line should be judged against.
 */
export function fitLeaseModel(txns) {
  const rows = usableRows(txns);
  if (rows.length < MIN_TREND_N * 2) return null;

  const towns = [...new Set(rows.map((r) => r.town))].sort();
  const types = [...new Set(rows.map((r) => r.flatType))].sort();
  const townCols = dummies(rows.map((r) => r.town), towns);
  const typeCols = dummies(rows.map((r) => r.flatType), types);

  const X = rows.map((r, i) => [r.lease, r.time, r.area, r.storey, ...townCols[i], ...typeCols[i]]);
  const fit = fitOls(X, rows.map((r) => r.psm));
  if (!fit) return null;

  const b = fit.coefficients[0];
  const meanPsm = rows.reduce((s, r) => s + r.psm, 0) / rows.length;
  const meanLease = fit.means[0];
  const lo = Math.floor(Math.min(...rows.map((r) => r.lease)));
  const hi = Math.ceil(Math.max(...rows.map((r) => r.lease)));

  const curve = [];
  for (let l = lo; l <= hi; l += 1) curve.push({ lease: l, psm: round(meanPsm + b * (l - meanLease)) });

  const groups = new Map();
  for (const r of rows) {
    const key = Math.floor(r.lease / 5) * 5;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r.psm);
  }
  const bins = [...groups.entries()]
    .filter(([, xs]) => xs.length >= 3)
    .map(([lease, xs]) => ({ lease: lease + 2.5, psm: median(xs), n: xs.length }))
    .sort((a, c) => a.lease - c.lease);

  return {
    n: rows.length,
    r2: round(fit.r2, 3),
    psmPerLeaseYear: round(b, 1),
    meanPsm: round(meanPsm),
    leaseRange: [lo, hi],
    controls: ["sale date", "floor area", "storey", ...(towns.length > 1 ? ["town"] : []),
      ...(types.length > 1 ? ["flat type"] : [])],
    curve,
    bins,
  };
}
