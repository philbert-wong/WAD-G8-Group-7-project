// Shared test setup: a throwaway MongoDB that lives in memory, so tests never touch your real database.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../server/db.js';
import { Block } from '../server/models/Block.js';
import { Amenity } from '../server/models/Amenity.js';

// Three blocks:
//   A  Ang Mo Kio  4 ROOM  $560,000  old lease (1979)  6 min walk
//   B  Punggol     4 ROOM  $680,000  new lease (2018)  3 min walk   <- has an MRT and hawker centre next to it
//   C  Bedok       3 ROOM  $360,000  old lease (1979)  15 min walk
const testBlocks = [
  { block: '406', street: 'ANG MO KIO AVE 10', town: 'ANG MO KIO', flatType: '4 ROOM', price: 560000, leaseCommenceYear: 1979, mrtName: 'Ang Mo Kio MRT', mrtWalkMinutes: 6, location: { type: 'Point', coordinates: [103.85, 1.37] } },
  { block: '233C', street: 'SUMANG LANE', town: 'PUNGGOL', flatType: '4 ROOM', price: 680000, leaseCommenceYear: 2018, mrtName: 'Punggol MRT', mrtWalkMinutes: 3, location: { type: 'Point', coordinates: [103.9, 1.4] } },
  { block: '560', street: 'BEDOK NTH AVE 1', town: 'BEDOK', flatType: '3 ROOM', price: 360000, leaseCommenceYear: 1979, mrtName: 'Bedok MRT', mrtWalkMinutes: 15, location: { type: 'Point', coordinates: [103.93, 1.33] } },
];

const testAmenities = [
  { category: 'mrt', name: 'Test MRT', location: { type: 'Point', coordinates: [103.901, 1.4] } },
  { category: 'hawker', name: 'Test Hawker', location: { type: 'Point', coordinates: [103.905, 1.4] } },
];

export async function startTestDb() {
  const mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  return mongo;
}

export async function stopTestDb(mongo) {
  await disconnectDb();
  await mongo.stop();
}

// Fills the blocks and amenities, and returns the saved blocks so tests can use their ids.
export async function loadTestData() {
  await Block.deleteMany({});
  await Amenity.deleteMany({});
  const blocks = await Block.insertMany(testBlocks);
  await Amenity.insertMany(testAmenities);
  // wait for the geospatial indexes to exist before any $geoNear query
  await Block.init();
  await Amenity.init();
  return { angMoKio: blocks[0], punggol: blocks[1], bedok: blocks[2] };
}
