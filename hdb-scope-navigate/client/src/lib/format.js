/** Number formatting. OWNER: Frontend — Shell & UI */

export const money = (n) => (n == null || !Number.isFinite(n) ? "—" : `S$${Math.round(n).toLocaleString()}`);

/** 528000 → "S$528k", 1250000 → "S$1.25M" */
export function moneyShort(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `S$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1_000) return `S$${Math.round(n / 1_000)}k`;
  return `S$${Math.round(n)}`;
}

/** Signed, for $/year changes: +S$12,400 */
export const signedMoney = (n) =>
  n == null || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : "+"}S$${Math.abs(Math.round(n)).toLocaleString()}`;

export const metres = (m) => (m == null ? "—" : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export const years = (y) => (y == null ? "—" : `${Math.round(y)} yrs`);
