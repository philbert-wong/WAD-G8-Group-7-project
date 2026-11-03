// Fills MongoDB from the two JSON files in server/data/.   Run with:  pnpm seed
// It clears the blocks and amenities first, so it is safe to run again.
// It does NOT touch the shortlist (but saved items point to old block ids, so they stop showing).
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const blockModel = require('./models/block-model');
const amenityModel = require('./models/amenity-model');

// The parts of the models this file uses
const Block = blockModel.Block;
const Amenity = amenityModel.Amenity;
const CATEGORIES = amenityModel.CATEGORIES;
const straightLineDistance = amenityModel.straightLineDistance;

// Same settings file as server.js
dotenv.config({ path: './config.env' });

const WALKING_METRES_PER_MINUTE = 80;
const ROUTE_IS_LONGER_THAN_STRAIGHT_LINE = 1.3; // streets are not straight

// Reads one of the JSON files in server/data/ (__dirname = the folder this file is in)
function readJson(fileName) {
  const filePath = path.join(__dirname, 'data', fileName);
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

const blocks = readJson('blocks.json').blocks;
const amenities = readJson('amenities.json');

// Just the MRT stations
const stations = amenities.filter(function (amenity) {
  return amenity.category === 'mrt';
});

// The block's nearest MRT / LRT station and the walk to it: { mrtName, mrtWalkMinutes, walkingMetres }.
// Uses the REAL walk measured by prep/addWalks.js (OneMap walking routes, saved as block.walk) when there is one.
// Otherwise: the closest station in a straight line, with the walk estimated as 1.3 x that distance.
function nearestStation(block) {
  let stationName = null;
  let walkingMetres = null;

  if (block.walk) {
    stationName = block.walk.station;
    walkingMetres = block.walk.metres;
  } else {
    let bestStation = null;
    let bestMetres = null;
    for (const station of stations) {
      const metres = straightLineDistance([block.lat, block.lng], [station.lat, station.lng]);
      if (bestMetres === null || metres < bestMetres) {
        bestStation = station;
        bestMetres = metres;
      }
    }
    stationName = bestStation.name;
    walkingMetres = bestMetres * ROUTE_IS_LONGER_THAN_STRAIGHT_LINE;
  }

  // Minutes worked out from the metres (at least 1 minute, even if the station is right next door),
  // so the minutes always go up in the same order as the metres
  const walkMinutes = Math.max(1, Math.round(walkingMetres / WALKING_METRES_PER_MINUTE));
  return { mrtName: stationName, mrtWalkMinutes: walkMinutes, walkingMetres: Math.round(walkingMetres) };
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

  // Straight-line distances to the nearest school, hawker centre and park; for the MRT, the WALKING distance,
  // so the match score's Transport part, the walking minutes and the station name all come from the same walk
  const distances = nearestDistances(b);
  distances.mrt = station.walkingMetres;

  blockDocs.push({
    block: b.block,
    street: b.street,
    town: b.town,
    postal: b.postal, // from prep/addPostal.js (missing for the few blocks OneMap has no postal code for)
    flatType: b.flatType,
    price: b.price,
    priceLow: b.priceLow,
    priceHigh: b.priceHigh,
    sales: b.sales,
    leaseCommenceYear: b.leaseCommenceYear,
    mrtName: station.mrtName,
    mrtWalkMinutes: station.mrtWalkMinutes,
    distances: distances,
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

// Connect, replace the blocks and amenities, then disconnect
async function seed() {
  // DB in config.env if it is there, otherwise the MongoDB running on this computer (same as server.js)
  let dbAddress = 'mongodb://127.0.0.1:27017/check-in';
  if (process.env.DB) {
    dbAddress = process.env.DB;
  }

  try {
    await mongoose.connect(dbAddress, { serverSelectionTimeoutMS: 8000 });
    await Block.deleteMany({});
    await Amenity.deleteMany({});
    await Block.insertMany(blockDocs);
    await Amenity.insertMany(amenityDocs);

    const blockCount = await Block.countDocuments();
    const amenityCount = await Amenity.countDocuments();
    console.log('Seeded ' + blockCount + ' blocks and ' + amenityCount + ' amenities');
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}

seed();
