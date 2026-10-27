// Shared test setup: a throwaway MongoDB that lives in memory, so tests never touch your real database.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../db.js';
import { Block } from '../models/Block.js';
import { Amenity } from '../models/Amenity.js';

// Three blocks:
//   A  Ang Mo Kio  4 ROOM  $560,000  old lease (1979)  6 min walk
//   B  Punggol     4 ROOM  $680,000  new lease (2018)  3 min walk   <- has an MRT and hawker centre next to it
//   C  Bedok       3 ROOM  $360,000  old lease (1979)  15 min walk

import request from 'supertest';
import { createApp } from '../app.js';

export async function getToken(email = 'test@example.com') {
  const res = await request(createApp())
    .post('/api/auth/register')
    .send({ email: email, password: 'password123' });
  return res.body.token;
}

const testBlocks = [
  { block: '406', street: 'ANG MO KIO AVE 10', town: 'ANG MO KIO', flatType: '4 ROOM', price: 560000, priceLow: 560000, priceHigh: 560000, leaseCommenceYear: 1979, mrtName: 'Ang Mo Kio MRT', mrtWalkMinutes: 6, location: { type: 'Point', coordinates: [103.85, 1.37] } },
  {
    block: '233C', street: 'SUMANG LANE', town: 'PUNGGOL', flatType: '4 ROOM', price: 680000, priceLow: 650000, priceHigh: 720000, leaseCommenceYear: 2018, mrtName: 'Punggol MRT', mrtWalkMinutes: 3, location: { type: 'Point', coordinates: [103.9, 1.4] },
    distances: { school: 900, mrt: 110, hawker: 560, park: 600 },
    sales: [
      { month: '2026-09', storey: '13 TO 15', areaSqm: 93, price: 720000 },
      { month: '2026-05', storey: '07 TO 09', areaSqm: 93, price: 680000 },
      { month: '2026-01', storey: '01 TO 03', areaSqm: 92, price: 650000 },
    ],
  },
  { block: '560', street: 'BEDOK NTH AVE 1', town: 'BEDOK', flatType: '3 ROOM', price: 360000, priceLow: 360000, priceHigh: 360000, leaseCommenceYear: 1979, mrtName: 'Bedok MRT', mrtWalkMinutes: 15, location: { type: 'Point', coordinates: [103.93, 1.33] } },
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
