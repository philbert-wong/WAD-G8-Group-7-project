// ONE-TIME script that builds the two data files the app reads:
//   server/data/blocks.json      real prices (from the resale CSV) + coordinates (from OneMap)
//   server/data/amenities.json   MRT stations, hawker centres, parks, primary schools
//
// Run it with the path to the resale CSV:
//   node prep/makeData.js "/path/to/resale-prices.csv"
//
// It calls OneMap and data.gov.sg for a few minutes. Answers are cached in prep/geocode-cache.json,
// so running it again is quick. You do NOT need to run this to use the app: the JSON files are committed.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { summariseResale } from './summariseResale.js';
import { findPoint, saveCache } from './oneMap.js';
import { DATASETS, downloadDataset, parsePoints, parseSchools } from './amenityFiles.js';
import { straightLineDistance } from '../server/lib/straightLineDistance.js';

const TOWNS = ['ANG MO KIO', 'BISHAN', 'PUNGGOL', 'TAMPINES'];
const BLOCKS_PER_TOWN = 40;
const KEEP_AMENITIES_WITHIN_METRES = 3000;

// MRT stations in and around those four towns
const MRT_STATIONS = [
  'Ang Mo Kio', 'Yio Chu Kang', 'Bishan', 'Braddell', 'Marymount', 'Caldecott', 'Toa Payoh', 'Lorong Chuan',
  'Serangoon', 'Upper Thomson', 'Mayflower', 'Khatib', 'Tampines', 'Tampines East', 'Tampines West', 'Simei',
  'Pasir Ris', 'Tanah Merah', 'Bedok Reservoir', 'Bedok North', 'Punggol', 'Punggol Coast', 'Sengkang',
  'Buangkok', 'Hougang', 'Kovan',
];

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node prep/makeData.js "/path/to/resale-prices.csv"');
  process.exit(1);
}

// Rounds a latitude or longitude to 6 decimal places (about 10 cm), to keep the files small
function roundCoordinate(number) {
  return Math.round(number * 1000000) / 1000000;
}

// ---------- 1. blocks: prices from the CSV, coordinates from OneMap ----------
console.log('1/3 Reading the resale CSV...');
const rows = parse(readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true });
const summary = summariseResale(rows, { towns: TOWNS, blocksPerTown: BLOCKS_PER_TOWN });
const latestMonth = summary.latestMonth;
const listings = summary.listings;
console.log('  data up to ' + latestMonth + '; ' + listings.length + ' listings');

// Each block + street once (one block can have several flat types, but one location)
const uniqueBlocks = [];
const seenKeys = [];
for (const listing of listings) {
  const key = listing.block + '|' + listing.street;
  if (!seenKeys.includes(key)) {
    seenKeys.push(key);
    uniqueBlocks.push({ key: key, block: listing.block, street: listing.street });
  }
}
console.log(
  '  looking up ' +
    uniqueBlocks.length +
    ' blocks on OneMap (about ' +
    Math.ceil(uniqueBlocks.length / 60) +
    ' min)...',
);

// points["406|ANG MO KIO AVE 10"] = { lat, lng, postal }
const points = {};
for (let i = 0; i < uniqueBlocks.length; i++) {
  const wanted = uniqueBlocks[i];

  // Only accept a OneMap result with the same block number
  function isSameBlock(hit) {
    return String(hit.BLK_NO).toUpperCase() === wanted.block.toUpperCase();
  }

  const point = await findPoint(wanted.block + ' ' + wanted.street, isSameBlock);
  if (point) {
    points[wanted.key] = point;
  } else {
    console.log('  no match for ' + wanted.block + ' ' + wanted.street);
  }
  if ((i + 1) % 25 === 0) {
    console.log('  ' + (i + 1) + '/' + uniqueBlocks.length);
  }
}
saveCache();

// Keep the listings we found a location for, and add lat / lng to them
const blocks = [];
for (const listing of listings) {
  const point = points[listing.block + '|' + listing.street];
  if (point !== undefined) {
    blocks.push({
      block: listing.block,
      street: listing.street,
      town: listing.town,
      flatType: listing.flatType,
      price: listing.price,
      priceLow: listing.priceLow,
      priceHigh: listing.priceHigh,
      leaseCommenceYear: listing.leaseCommenceYear,
      sales: listing.sales,
      lat: point.lat,
      lng: point.lng,
    });
  }
}

// ---------- 2. amenities ----------
console.log('2/3 Amenities...');
const amenities = [];

// Only accept OneMap results that really are MRT stations
function isMrtStation(hit) {
  return String(hit.SEARCHVAL).toUpperCase().includes('MRT STATION');
}

for (const name of MRT_STATIONS) {
  const point = await findPoint(name + ' MRT STATION', isMrtStation);
  if (point) {
    amenities.push({ category: 'mrt', name: name + ' MRT', lat: point.lat, lng: point.lng });
  } else {
    console.log('  no match for ' + name + ' MRT');
  }
}
console.log('  ' + amenities.length + ' MRT stations');

for (const category of ['hawker', 'park']) {
  const found = parsePoints(await downloadDataset(DATASETS[category]), category);
  console.log('  ' + found.length + ' ' + category + ' records');
  for (const amenity of found) {
    amenities.push(amenity);
  }
}

const schools = parseSchools(await downloadDataset(DATASETS.school));
console.log(
  '  ' +
    schools.length +
    ' primary schools; looking up their postal codes (about ' +
    Math.ceil(schools.length / 60) +
    ' min)...',
);
for (const school of schools) {
  const point = await findPoint(school.postal);
  if (point) {
    amenities.push({ category: 'school', name: school.name, lat: point.lat, lng: point.lng });
  }
}
saveCache();

// ---------- 3. keep only amenities near our blocks, and write the files ----------
console.log('3/3 Writing files...');

// Is this amenity within 3 km of at least one of our blocks?
function isNearOurBlocks(amenity) {
  for (const block of blocks) {
    const metres = straightLineDistance([amenity.lat, amenity.lng], [block.lat, block.lng]);
    if (metres <= KEEP_AMENITIES_WITHIN_METRES) {
      return true;
    }
  }
  return false;
}
const nearOurBlocks = amenities.filter(isNearOurBlocks);

const tidyAmenities = [];
for (const amenity of nearOurBlocks) {
  tidyAmenities.push({
    category: amenity.category,
    name: amenity.name,
    lat: roundCoordinate(amenity.lat),
    lng: roundCoordinate(amenity.lng),
  });
}

const tidyBlocks = [];
for (const block of blocks) {
  tidyBlocks.push({
    block: block.block,
    street: block.street,
    town: block.town,
    flatType: block.flatType,
    price: block.price,
    priceLow: block.priceLow,
    priceHigh: block.priceHigh,
    leaseCommenceYear: block.leaseCommenceYear,
    sales: block.sales,
    lat: roundCoordinate(block.lat),
    lng: roundCoordinate(block.lng),
  });
}

writeFileSync(
  new URL('../server/data/blocks.json', import.meta.url),
  JSON.stringify({ dataUpTo: latestMonth, blocks: tidyBlocks }, null, 1),
);
writeFileSync(
  new URL('../server/data/amenities.json', import.meta.url),
  JSON.stringify(tidyAmenities, null, 1),
);

// How many amenities of one category we kept
function countCategory(category) {
  let count = 0;
  for (const amenity of tidyAmenities) {
    if (amenity.category === category) {
      count = count + 1;
    }
  }
  return count;
}

console.log(
  'Done: ' +
    tidyBlocks.length +
    ' listings, ' +
    tidyAmenities.length +
    ' amenities (mrt ' +
    countCategory('mrt') +
    ', hawker ' +
    countCategory('hawker') +
    ', park ' +
    countCategory('park') +
    ', school ' +
    countCategory('school') +
    ')',
);
