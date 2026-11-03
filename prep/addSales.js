// Adds the individual sales (month, storey, floor area, price) and the price range
// to the blocks already in server/data/blocks.json. Keeps the same blocks, coordinates
// and 12-month window, so it does not call OneMap.
//
//   node prep/addSales.js "/path/to/resale-prices.csv"
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { summariseResale } from './summariseResale.js';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node prep/addSales.js "/path/to/resale-prices.csv"');
  process.exit(1);
}

// 1. Read the blocks we already have
// (this path starts from this file's folder, so the script works from any folder)
const BLOCKS_FILE = new URL('../server/data/blocks.json', import.meta.url);
const data = JSON.parse(readFileSync(BLOCKS_FILE, 'utf8'));
const blocks = data.blocks;

// the towns in our file, each one listed once
const towns = [];
for (const b of blocks) {
  if (towns.includes(b.town) === false) {
    towns.push(b.town);
  }
}

// 2. Read the CSV and group the sales, using the same 12 months as before
const rows = parse(readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true });
const result = summariseResale(rows, {
  towns: towns,
  blocksPerTown: 100000, // a very big number = keep every block
  latestMonth: data.dataUpTo,
});

// A name for each listing, e.g. "406|ANG MO KIO AVE 10|4 ROOM|1979"
function keyOf(listing) {
  return listing.block + '|' + listing.street + '|' + listing.flatType + '|' + listing.leaseCommenceYear;
}

// So we can look up a listing by its name
const listingByKey = {};
for (const listing of result.listings) {
  listingByKey[keyOf(listing)] = listing;
}

// 3. Copy each block, with the new price, range and sales
const updated = [];
let changedPrice = 0;
for (const b of blocks) {
  const listing = listingByKey[keyOf(b)];
  if (listing === undefined) {
    throw new Error('No sales found for ' + keyOf(b));
  }
  if (listing.price !== b.price) {
    changedPrice = changedPrice + 1;
  }
  updated.push({
    block: b.block,
    street: b.street,
    town: b.town,
    postal: b.postal, // keep the postal code from prep/addPostal.js
    flatType: b.flatType,
    price: listing.price,
    leaseCommenceYear: b.leaseCommenceYear,
    lat: b.lat,
    lng: b.lng,
    priceLow: listing.priceLow,
    priceHigh: listing.priceHigh,
    sales: listing.sales,
  });
}

// 4. Save the file
writeFileSync(BLOCKS_FILE, JSON.stringify({ dataUpTo: data.dataUpTo, blocks: updated }, null, 1));

let totalSales = 0;
for (const b of updated) {
  totalSales = totalSales + b.sales.length;
}
console.log('Updated ' + updated.length + ' listings with ' + totalSales + ' sales (' + changedPrice + ' median prices changed)');
