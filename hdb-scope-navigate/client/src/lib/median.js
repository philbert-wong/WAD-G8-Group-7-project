/** Median of a list of numbers, or null if there are none. OWNER: Frontend — Data Views */
export function median(numbers) {
  const xs = numbers.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
}
