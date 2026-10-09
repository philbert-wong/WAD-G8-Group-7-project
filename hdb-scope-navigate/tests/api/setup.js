/**
 * SKELETON — write this file.  OWNER: me (test setup)
 * ─────────────────────────────────────────────────────────────────────
 * WHAT API TESTS NEED
 *   A real MongoDB to talk to — but NOT your Atlas database (tests must never
 *   touch real data). `mongodb-memory-server` runs a throwaway MongoDB inside
 *   your computer's memory and throws it away afterwards.
 *   (First run downloads a MongoDB binary, so it needs internet and ~1 minute.)
 *
 * WHAT TO EXPORT (the tests import these)
 *   startTestDb()   — start the in-memory MongoDB and connect Mongoose to it
 *   stopTestDb()    — disconnect and shut it down
 *   resetTestDb()   — empty every collection, so one test can't affect the next
 *   seedBlocks()    — insert a few known Block documents and return them
 *
 * STEPS
 *   1. import { MongoMemoryServer } from "mongodb-memory-server";
 *      import mongoose from "mongoose";
 *      import Block from "../../server/models/Block.js";
 *
 *   2. let mongod;   (module-level, so stop can reach it)
 *
 *   3. startTestDb:  mongod = await MongoMemoryServer.create();
 *                    await mongoose.connect(mongod.getUri());
 *
 *   4. stopTestDb:   await mongoose.disconnect();  await mongod.stop();
 *
 *   5. resetTestDb:  await Block.deleteMany({});   (add other models you use)
 *
 *   6. seedBlocks:   Block.create(...) three blocks you CONTROL, so test answers are predictable:
 *        - one in Ang Mo Kio, near [lng 103.854, lat 1.362], 4 ROOM at 520000, lease 52, MRT 8 min
 *        - one in Bishan, ~2 km away, 4 ROOM at 700000, lease 60, MRT 6 min
 *        - one far away in Jurong West, 3 ROOM only, 400000, lease 70, MRT 14 min
 *      Each block needs: key, block, streetName, town, location { type: "Point",
 *      coordinates: [lng, lat] }, stats, remainingLeaseYears, nearestMrt.
 *      See server/models/Block.js and scripts/seed-sample.js for the shape.
 *      !! coordinates are [longitude, latitude] — longitude FIRST.
 *      !! the 2dsphere index must exist before $near works: after connecting,
 *         `await Block.init();` (or syncIndexes) — otherwise $near fails.
 *
 * WHY KNOWN DATA MATTERS
 *   A test like "maxPrice=600000 returns 1 block" only means something if you
 *   know exactly which blocks exist.
 */
export async function startTestDb() { throw new Error("Not written yet"); }
export async function stopTestDb() { throw new Error("Not written yet"); }
export async function resetTestDb() { throw new Error("Not written yet"); }
export async function seedBlocks() { throw new Error("Not written yet"); }
