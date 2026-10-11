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

// ---------- 1. blocks: prices from the CSV, coordinates from OneMap ----------
console.log('1/3 Reading the resale CSV...');
const rows = parse(readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true });
const { latestMonth, listings } = summariseResale(rows, { towns: TOWNS, blocksPerTown: BLOCKS_PER_TOWN });
console.log(`  data up to ${latestMonth}; ${listings.length} listings`);

const uniqueBlocks = [...new Set(listings.map((l) => `${l.block}|${l.street}`))];
console.log(`  looking up ${uniqueBlocks.length} blocks on OneMap (about ${Math.ceil(uniqueBlocks.length / 60)} min)...`);

const points = new Map();
for (const [i, key] of uniqueBlocks.entries()) {
  const [block, street] = key.split('|');
  const point = await findPoint(`${block} ${street}`, (hit) => String(hit.BLK_NO).toUpperCase() === block.toUpperCase());
  if (point) points.set(key, point);
  else console.log(`  no match for ${block} ${street}`);
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${uniqueBlocks.length}`);
}
saveCache();

const blocks = listings
  .filter((l) => points.has(`${l.block}|${l.street}`))
  .map((l) => ({ ...l, lat: points.get(`${l.block}|${l.street}`).lat, lng: points.get(`${l.block}|${l.street}`).lng }));

// ---------- 2. amenities ----------
console.log('2/3 Amenities...');
const amenities = [];

for (const name of MRT_STATIONS) {
  const point = await findPoint(`${name} MRT STATION`, (hit) => /MRT STATION/i.test(hit.SEARCHVAL));
  if (point) amenities.push({ category: 'mrt', name: `${name} MRT`, lat: point.lat, lng: point.lng });
  else console.log(`  no match for ${name} MRT`);
}
console.log(`  ${amenities.length} MRT stations`);

for (const category of ['hawker', 'park']) {
  const found = parsePoints(await downloadDataset(DATASETS[category]), category);
  console.log(`  ${found.length} ${category} records`);
  amenities.push(...found);
}

const schools = parseSchools(await downloadDataset(DATASETS.school));
console.log(`  ${schools.length} primary schools; looking up their postal codes (about ${Math.ceil(schools.length / 60)} min)...`);
for (const school of schools) {
  const point = await findPoint(school.postal);
  if (point) amenities.push({ category: 'school', name: school.name, lat: point.lat, lng: point.lng });
}
saveCache();

// ---------- 3. keep only amenities near our blocks, and write the files ----------
console.log('3/3 Writing files...');
const nearOurBlocks = amenities.filter((a) =>
  blocks.some((b) => straightLineDistance([a.lat, a.lng], [b.lat, b.lng]) <= KEEP_AMENITIES_WITHIN_METRES));

const round = (n) => Math.round(n * 1e6) / 1e6;
const tidyAmenities = nearOurBlocks.map((a) => ({ ...a, lat: round(a.lat), lng: round(a.lng) }));
const tidyBlocks = blocks.map((b) => ({ ...b, lat: round(b.lat), lng: round(b.lng) }));

writeFileSync(new URL('../server/data/blocks.json', import.meta.url), JSON.stringify({ dataUpTo: latestMonth, blocks: tidyBlocks }, null, 1));
writeFileSync(new URL('../server/data/amenities.json', import.meta.url), JSON.stringify(tidyAmenities, null, 1));

const count = (category) => tidyAmenities.filter((a) => a.category === category).length;
console.log(`Done: ${tidyBlocks.length} listings, ${tidyAmenities.length} amenities `
  + `(mrt ${count('mrt')}, hawker ${count('hawker')}, park ${count('park')}, school ${count('school')})`);
