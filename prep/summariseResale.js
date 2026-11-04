// Turns the raw resale CSV rows into one row per (block, flat type) with a typical price,
// the price range, and the individual sales behind it.
// Pure functions: rows in, rows out. No network, no database.

// Used by .sort() to put numbers from small to big
function compareNumbers(a, b) {
  return a - b;
}

// The middle value of a list of numbers (average of the two middle ones when the count is even)
function median(numbers) {
  // copy the list first, so sorting does not change the original
  const sorted = [];
  for (const number of numbers) {
    sorted.push(number);
  }
  sorted.sort(compareNumbers);

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// "2026-08" minus 12 months -> "2025-08". Months after this one count as "recent".
function monthTwelveBefore(month) {
  const parts = month.split('-'); // ["2026", "08"]
  const year = Number(parts[0]);
  return year - 1 + '-' + parts[1];
}

// Used by .sort() to put the newest sale first ("2026-09" comes before "2026-05")
function compareNewestMonthFirst(a, b) {
  if (a.month > b.month) {
    return -1; // a is newer, so a goes first
  }
  if (a.month < b.month) {
    return 1; // b is newer, so b goes first
  }
  return 0; // same month
}

// Used by .sort() to put the block with the most sales first
function compareMostSalesFirst(a, b) {
  return b.salesCount - a.salesCount;
}

// rows: parsed CSV rows.
// options.towns: which towns to keep. options.blocksPerTown: how many busiest blocks per town.
// options.minSales: ignore listings with fewer sales than this (default 3).
// options.latestMonth: end of the 12-month window (default: the newest month in the CSV).
export function summariseResale(rows, options) {
  const towns = options.towns;
  const blocksPerTown = options.blocksPerTown;

  let minSales = 3;
  if (options.minSales !== undefined) {
    minSales = options.minSales;
  }

  // no month given: use the newest month in the CSV
  let latestMonth = options.latestMonth;
  if (latestMonth === undefined) {
    latestMonth = '0000-00';
    for (const row of rows) {
      if (row.month > latestMonth) {
        latestMonth = row.month;
      }
    }
  }
  const cutoff = monthTwelveBefore(latestMonth);

  // Group the recent sales by block + street + flat type + town + lease year.
  // groups["406|ANG MO KIO AVE 10|4 ROOM|..."] = { block, street, ..., sales: [...] }
  // groupKeys remembers the order in which we first saw each group.
  const groups = {};
  const groupKeys = [];
  for (const row of rows) {
    // only keep the sale if it passes all three checks
    if (towns.includes(row.town)) {
      // one of our towns
      if (row.month > cutoff) {
        // not older than 12 months
        if (row.month <= latestMonth) {
          // not newer than the window we asked for
          const key =
            row.block +
            '|' +
            row.street_name +
            '|' +
            row.flat_type +
            '|' +
            row.town +
            '|' +
            row.lease_commence_date;

          if (groups[key] === undefined) {
            groups[key] = {
              block: row.block,
              street: row.street_name,
              flatType: row.flat_type,
              town: row.town,
              leaseCommenceYear: row.lease_commence_date,
              sales: [],
            };
            groupKeys.push(key);
          }

          groups[key].sales.push({
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
  for (const key of groupKeys) {
    const group = groups[key];
    const sales = group.sales;

    if (sales.length >= minSales) {
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

      sales.sort(compareNewestMonthFirst);

      listings.push({
        block: group.block,
        street: group.street,
        town: group.town,
        flatType: group.flatType,
        price: median(prices),
        priceLow: priceLow,
        priceHigh: priceHigh,
        leaseCommenceYear: Number(group.leaseCommenceYear),
        sales: sales,
      });
    }
  }

  // Keep the busiest blocks in each town (most recent sales), with all of their flat types
  const kept = [];
  for (const town of towns) {
    const inTown = listings.filter(function (listing) {
      return listing.town === town;
    });

    // Add up the sales of each block (one block can have several flat types)
    const salesPerBlock = {};
    const blockKeys = [];
    for (const listing of inTown) {
      const blockKey = listing.block + '|' + listing.street;
      if (salesPerBlock[blockKey] === undefined) {
        salesPerBlock[blockKey] = 0;
        blockKeys.push(blockKey);
      }
      salesPerBlock[blockKey] = salesPerBlock[blockKey] + listing.sales.length;
    }

    // Rank the blocks, most sales first, and keep the top ones
    const ranked = [];
    for (const blockKey of blockKeys) {
      ranked.push({ blockKey: blockKey, salesCount: salesPerBlock[blockKey] });
    }
    ranked.sort(compareMostSalesFirst);

    const busiest = [];
    for (const entry of ranked.slice(0, blocksPerTown)) {
      busiest.push(entry.blockKey);
    }

    for (const listing of inTown) {
      if (busiest.includes(listing.block + '|' + listing.street)) {
        kept.push(listing);
      }
    }
  }

  return { latestMonth: latestMonth, listings: kept };
}
