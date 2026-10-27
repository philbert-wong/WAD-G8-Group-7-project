// Fills MongoDB from the two JSON files in server/data/.   Run with:  pnpm seed
// It clears the blocks and amenities first, so it is safe to run again.
// It does NOT touch the shortlist (but saved items point to old block ids, so they stop showing).
import { readFileSync } from 'node:fs';
import { mongoUri } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { Block } from './models/block-model.js';
import { Amenity, CATEGORIES, straightLineDistance } from './models/amenity-model.js';

const WALKING_METRES_PER_MINUTE = 80;
const ROUTE_IS_LONGER_THAN_STRAIGHT_LINE = 1.3; // streets are not straight

// Reads one of the JSON files in server/data/
function readJson(fileName) {
  const path = new URL('./data/' + fileName, import.meta.url);
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text);
}

const blocks = readJson('blocks.json').blocks;
const amenities = readJson('amenities.json');

// Just the MRT stations
const stations = amenities.filter(function (amenity) {
  return amenity.category === 'mrt';
});

// Finds the closest MRT station and works out the walking minutes to it
function nearestStation(block) {
  let bestStation = null;
  let bestMetres = null;
  for (const station of stations) {
    const metres = straightLineDistance([block.lat, block.lng], [station.lat, station.lng]);
    if (bestMetres === null || metres < bestMetres) {
      bestStation = station;
      bestMetres = metres;
    }
  }

  const walkingMetres = bestMetres * ROUTE_IS_LONGER_THAN_STRAIGHT_LINE;
  // at least 1 minute, even if the station is right next door
  const walkMinutes = Math.max(1, Math.round(walkingMetres / WALKING_METRES_PER_MINUTE));
  return { mrtName: bestStation.name, mrtWalkMinutes: walkMinutes };
}

// Straight-line metres from a block to the closest amenity of one category (e.g. 'park')
function nearestDistance(block, category) {
  let best = null;
  for (const amenity of amenities) {
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
  for (const category of CATEGORIES) {
    distances[category] = nearestDistance(block, category);
  }
  return distances;
}

// What each block looks like in MongoDB
const blockDocs = [];
for (const b of blocks) {
  const station = nearestStation(b);
  blockDocs.push({
    block: b.block,
    street: b.street,
    town: b.town,
    flatType: b.flatType,
    price: b.price,
    priceLow: b.priceLow,
    priceHigh: b.priceHigh,
    sales: b.sales,
    leaseCommenceYear: b.leaseCommenceYear,
    mrtName: station.mrtName,
    mrtWalkMinutes: station.mrtWalkMinutes,
    distances: nearestDistances(b),
    location: { type: 'Point', coordinates: [b.lng, b.lat] }, // [lng, lat]
  });
}

// What each amenity looks like in MongoDB
const amenityDocs = [];
for (const a of amenities) {
  amenityDocs.push({
    category: a.category,
    name: a.name,
    location: { type: 'Point', coordinates: [a.lng, a.lat] },
  });
}

await connectDb(mongoUri);
await Block.deleteMany({});
await Amenity.deleteMany({});
await Block.insertMany(blockDocs);
await Amenity.insertMany(amenityDocs);

const blockCount = await Block.countDocuments();
const amenityCount = await Amenity.countDocuments();
console.log('Seeded ' + blockCount + ' blocks and ' + amenityCount + ' amenities');
await disconnectDb();
