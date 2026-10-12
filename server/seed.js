// Fills MongoDB from the two JSON files in server/data/.   Run with:  npm run seed
// It clears the blocks and amenities first, so it is safe to run again.
// It does NOT touch the shortlist.
import { readFileSync } from 'node:fs';
import { mongoUri } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { Block } from './models/Block.js';
import { Amenity, CATEGORIES } from './models/Amenity.js';
import { straightLineDistance } from './lib/straightLineDistance.js';

const WALKING_METRES_PER_MINUTE = 80;
const ROUTE_IS_LONGER_THAN_STRAIGHT_LINE = 1.3; // streets are not straight

function readJson(fileName) {
  return JSON.parse(readFileSync(new URL(`./data/${fileName}`, import.meta.url), 'utf8'));
}

const { blocks } = readJson('blocks.json');
const amenities = readJson('amenities.json');
const stations = amenities.filter((a) => a.category === 'mrt');

// Finds the closest MRT station and works out the walking minutes to it
function nearestStation(block) {
  let best = null;
  for (const station of stations) {
    const metres = straightLineDistance([block.lat, block.lng], [station.lat, station.lng]);
    if (!best || metres < best.metres) best = { station, metres };
  }
  const walkingMetres = best.metres * ROUTE_IS_LONGER_THAN_STRAIGHT_LINE;
  return {
    mrtName: best.station.name,
    mrtWalkMinutes: Math.max(1, Math.round(walkingMetres / WALKING_METRES_PER_MINUTE)),
  };
}

// Straight-line metres from a block to the closest amenity of one category (e.g. 'park')
function nearestDistance(block, category) {
  let best = null;
  for (let i = 0; i < amenities.length; i++) {
    const amenity = amenities[i];
    if (amenity.category === category) {
      const metres = straightLineDistance([block.lat, block.lng], [amenity.lat, amenity.lng]);
      if (best === null || metres < best) {
        best = metres;
      }
    }
  }
  if (best === null) {
    return null; // no amenities of this category in the data
  }
  return Math.round(best);
}

// Nearest distance for every category: { mrt: 350, hawker: 620, park: 180, school: 410 }
function nearestDistances(block) {
  const distances = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const category = CATEGORIES[i];
    distances[category] = nearestDistance(block, category);
  }
  return distances;
}

const blockDocs = blocks.map((b) => ({
  block: b.block,
  street: b.street,
  town: b.town,
  flatType: b.flatType,
  price: b.price,
  priceLow: b.priceLow,
  priceHigh: b.priceHigh,
  sales: b.sales,
  leaseCommenceYear: b.leaseCommenceYear,
  ...nearestStation(b),
  distances: nearestDistances(b),
  location: { type: 'Point', coordinates: [b.lng, b.lat] }, // [lng, lat]
}));

const amenityDocs = amenities.map((a) => ({
  category: a.category,
  name: a.name,
  location: { type: 'Point', coordinates: [a.lng, a.lat] },
}));

await connectDb(mongoUri);
await Block.deleteMany({});
await Amenity.deleteMany({});
await Block.insertMany(blockDocs);
await Amenity.insertMany(amenityDocs);
console.log(`Seeded ${await Block.countDocuments()} blocks and ${await Amenity.countDocuments()} amenities`);
await disconnectDb();
