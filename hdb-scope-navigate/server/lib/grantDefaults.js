/**
 * Grant and loan rules for HDB RESALE flats, as published on hdb.gov.sg.
 * Stored in MongoDB (GrantRule) so they can be corrected without a deploy; this
 * file is the fallback and the seed. OWNER: Backend & Database
 *
 * CHECK AGAINST HDB BEFORE THE DEMO — these change. Last checked 2026-08-20.
 *   https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility
 *
 * ⚠️  HDB publishes only the MAXIMUM, the ceiling and the end-points of the
 *     Enhanced CPF Housing Grant. The bands in between are interpolated here
 *     (flagged `approximate`). Paste the official table over `bands` if you have it.
 */

/** Evenly step an amount down across income bands of `width` up to `ceiling`. */
function ehgBands({ max, floor, ceiling, width = 500, firstBand = 1500 }) {
  const edges = [];
  for (let upTo = firstBand; upTo <= ceiling; upTo += width) edges.push(upTo);

  return edges.map((upTo, i) => {
    const t = edges.length === 1 ? 0 : i / (edges.length - 1);
    const raw = max - (max - floor) * t;
    return { upTo, amount: Math.round(raw / 2500) * 2500 };
  });
}

export const GRANT_DEFAULTS = {
  key: "resale",
  asOf: "2026-08-20",
  sourceUrl: "https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility",

  // CPF Housing Grant (Family Grant / Singles Grant) — resale
  cpfGrant: {
    family: {
      incomeCeiling: 14000,
      extendedFamilyCeiling: 21000,
      amounts: {
        SC_SC: { room2to4: 80000, room5plus: 50000 },
        SC_PR: { room2to4: 60000, room5plus: 40000 },
      },
    },
    single: { incomeCeiling: 7000, amounts: { room2to4: 40000, room5plus: 25000 } },
  },

  // Enhanced CPF Housing Grant
  ehg: {
    approximate: true,
    family: { max: 120000, incomeCeiling: 9000,
      bands: ehgBands({ max: 120000, floor: 5000, ceiling: 9000 }) },
    single: { max: 60000, incomeCeiling: 4500,
      bands: ehgBands({ max: 60000, floor: 2500, ceiling: 4500 }) },
  },

  // Proximity Housing Grant — no income ceiling
  phg: {
    nearKm: 4,
    family: { withParents: 30000, near: 20000 },
    single: { withParents: 15000, near: 10000 },
  },

  loans: {
    msr: 0.30,   // HDB loans only
    tdsr: 0.55,  // all loans
    hdb:  { label: "HDB loan",  ratePct: 2.6, ltv: 0.80, maxTenureYears: 25, minCashPct: 0 },
    bank: { label: "Bank loan", ratePct: 3.0, ltv: 0.75, maxTenureYears: 30, minCashPct: 0.05,
            stressRatePct: 4.0 },
  },
};
