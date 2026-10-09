/**
 * Price maths. Pure functions — no database, no network — which makes this the
 * easiest file in the project to unit test. OWNER: Data pipeline & QA
 */

export function median(numbers) {
  const xs = numbers.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
}

/**
 * Group a block's transactions by flat type and summarise each group.
 * Returns { "4 ROOM": { medianPrice, medianPsm, txnCount, lastTxnMonth }, ... }
 */
export function statsByFlatType(transactions) {
  const groups = {};
  for (const t of transactions) {
    (groups[t.flatType] ??= []).push(t);
  }

  const out = {};
  for (const [flatType, list] of Object.entries(groups)) {
    out[flatType] = {
      medianPrice:  median(list.map((t) => t.resalePrice)),
      medianPsm:    median(list.map((t) => t.pricePsm)),
      txnCount:     list.length,
      lastTxnMonth: list.map((t) => t.month).sort().at(-1),
    };
  }
  return out;
}

/** Remaining lease decays by one year per year. 99-year lease from commencement. */
export function remainingLeaseYears(leaseCommenceYear, asOf = new Date()) {
  if (!leaseCommenceYear) return null;
  const elapsed = asOf.getFullYear() - leaseCommenceYear;
  return Math.max(0, 99 - elapsed);
}
