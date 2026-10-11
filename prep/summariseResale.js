// Turns the raw resale CSV rows into one row per (block, flat type) with a typical price.
// Pure functions: rows in, rows out. No network, no database.

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// "2026-08" minus 12 months -> "2025-08". Months after this one count as "recent".
function monthTwelveBefore(month) {
  const [year, m] = month.split('-').map(Number);
  return `${year - 1}-${String(m).padStart(2, '0')}`;
}

// rows: parsed CSV rows. towns: which towns to keep. blocksPerTown: how many busiest blocks per town.
export function summariseResale(rows, { towns, blocksPerTown, minSales = 3 }) {
  const latestMonth = rows.reduce((latest, row) => (row.month > latest ? row.month : latest), '0000-00');
  const cutoff = monthTwelveBefore(latestMonth);

  // group recent sales: "406|ANG MO KIO AVE 10|4 ROOM" -> [prices...]
  const groups = new Map();
  for (const row of rows) {
    if (!towns.includes(row.town) || row.month <= cutoff) continue;
    const key = [row.block, row.street_name, row.flat_type, row.town, row.lease_commence_date].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number(row.resale_price));
  }

  const listings = [];
  for (const [key, prices] of groups) {
    if (prices.length < minSales) continue;
    const [block, street, flatType, town, leaseCommenceYear] = key.split('|');
    listings.push({ block, street, town, flatType, price: median(prices), leaseCommenceYear: Number(leaseCommenceYear), sales: prices.length });
  }

  // keep the busiest blocks in each town (most recent sales), with all of their flat types
  const kept = [];
  for (const town of towns) {
    const inTown = listings.filter((l) => l.town === town);
    const salesPerBlock = new Map();
    for (const l of inTown) {
      const blockKey = `${l.block}|${l.street}`;
      salesPerBlock.set(blockKey, (salesPerBlock.get(blockKey) ?? 0) + l.sales);
    }
    const busiest = [...salesPerBlock.entries()].sort((a, b) => b[1] - a[1]).slice(0, blocksPerTown).map(([k]) => k);
    kept.push(...inTown.filter((l) => busiest.includes(`${l.block}|${l.street}`)));
  }

  return { latestMonth, listings: kept };
}
