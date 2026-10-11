// Turns the raw resale CSV rows into one row per (block, flat type) with a typical price,
// the price range, and the individual sales behind it.
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
// latestMonth: end of the 12-month window (default: the newest month in the CSV).
export function summariseResale(rows, { towns, blocksPerTown, minSales = 3, latestMonth }) {
  // no month given: use the newest month in the CSV
  if (latestMonth === undefined) {
    latestMonth = '0000-00';
    for (const row of rows) {
      if (row.month > latestMonth) {
        latestMonth = row.month;
      }
    }
  }
  const cutoff = monthTwelveBefore(latestMonth);

  // group recent sales: "406|ANG MO KIO AVE 10|4 ROOM|..." -> [sales...]
  const groups = new Map();
  for (const row of rows) {
    // only keep the sale if it passes all three checks
    if (towns.includes(row.town)) { // one of our towns
      if (row.month > cutoff) { // not older than 12 months
        if (row.month <= latestMonth) { // not newer than the window we asked for
          const key = [row.block, row.street_name, row.flat_type, row.town, row.lease_commence_date].join('|');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push({
            month: row.month,
            storey: row.storey_range, // "04 TO 06"
            areaSqm: Number(row.floor_area_sqm),
            price: Number(row.resale_price),
          });
        }
      }
    }
  }

  const listings = [];
  for (const [key, sales] of groups) {
    if (sales.length < minSales) continue;
    const [block, street, flatType, town, leaseCommenceYear] = key.split('|');

    // collect the prices, and find the lowest and highest
    const prices = [];
    let priceLow = sales[0].price;
    let priceHigh = sales[0].price;
    for (const sale of sales) {
      prices.push(sale.price);
      if (sale.price < priceLow) {
        priceLow = sale.price;
      }
      if (sale.price > priceHigh) {
        priceHigh = sale.price;
      }
    }

    // newest sale first ("2026-09" comes before "2026-05")
    sales.sort((a, b) => {
      if (a.month > b.month) {
        return -1; // a is newer, so a goes first
      }
      if (a.month < b.month) {
        return 1; // b is newer, so b goes first
      }
      return 0; // same month
    });

    listings.push({
      block: block,
      street: street,
      town: town,
      flatType: flatType,
      price: median(prices),
      priceLow: priceLow,
      priceHigh: priceHigh,
      leaseCommenceYear: Number(leaseCommenceYear),
      sales: sales,
    });
  }

  // keep the busiest blocks in each town (most recent sales), with all of their flat types
  const kept = [];
  for (const town of towns) {
    const inTown = listings.filter((l) => l.town === town);
    const salesPerBlock = new Map();
    for (const l of inTown) {
      const blockKey = `${l.block}|${l.street}`;
      salesPerBlock.set(blockKey, (salesPerBlock.get(blockKey) ?? 0) + l.sales.length);
    }
    const busiest = [...salesPerBlock.entries()].sort((a, b) => b[1] - a[1]).slice(0, blocksPerTown).map(([k]) => k);
    kept.push(...inTown.filter((l) => busiest.includes(`${l.block}|${l.street}`)));
  }

  return { latestMonth, listings: kept };
}
