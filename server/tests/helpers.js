// Shared test setup. The real server.js is already running on port 8001 (started by start-test-server.js)
// and uses a throwaway MongoDB that lives in memory. These helpers connect to that SAME database
// to put test data in, so tests never touch your real database.
import { inject } from 'vitest';
import { createRequire } from 'node:module';
import request from 'supertest';

// Our server files use require (CommonJS, like class), so the tests load them with require too
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
export const Block = require('../models/block-model').Block;
export const Amenity = require('../models/amenity-model').Amenity;
export const Shortlist = require('../models/shortlist-model').Shortlist;
export const User = require('../models/user-model').User;

// Where the test server is listening (see start-test-server.js)
export const BASE_URL = 'http://localhost:8001';

// Three blocks:
//   A  Ang Mo Kio  4 ROOM  $560,000  old lease (1979)  6 min walk
//   B  Punggol     4 ROOM  $680,000  new lease (2018)  3 min walk   <- has an MRT and hawker centre next to it
//   C  Bedok       3 ROOM  $360,000  old lease (1979)  15 min walk

export async function getToken(email = 'test@example.com') {
  const res = await request(BASE_URL)
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

// Connects to the throwaway database and empties it, so every test file starts from nothing
export async function startTestDb() {
  await mongoose.connect(inject('dbUri'));
  await Block.deleteMany({});
  await Amenity.deleteMany({});
  await Shortlist.deleteMany({});
  await User.deleteMany({});
}

export async function stopTestDb() {
  await mongoose.disconnect();
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
