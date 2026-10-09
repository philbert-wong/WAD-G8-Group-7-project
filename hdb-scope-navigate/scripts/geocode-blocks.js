/**
 * Gives every block a latitude and longitude, via OneMap.
 *
 *   npm run geocode
 *
 * ⚠️  THIS TAKES HOURS. About 10,000 blocks at ~1 request/second. Start it in
 *     the evening and let it run. It is safe to stop and restart — it only
 *     processes blocks that aren't geocoded yet, so it picks up where it left off.
 *
 * OWNER: Maps & Location
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Block from "../server/models/Block.js";
import { geocodeBlock } from "../server/services/onemap.js";

const DELAY_MS = 1000;   // be a good citizen
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await connectDb();

  // [0,0] means "not geocoded yet" — see scripts/seed.js
  const pending = await Block.find({ "location.coordinates": [0, 0] });
  console.log(`${pending.length.toLocaleString()} blocks still need coordinates.`);

  let ok = 0, failed = 0;

  for (const [i, b] of pending.entries()) {
    try {
      const hit = await geocodeBlock(b.block, b.streetName);
      if (hit) {
        b.location = { type: "Point", coordinates: [hit.lng, hit.lat] };
        b.postalCode = hit.postal;
        await b.save();
        ok++;
      } else {
        failed++;
        console.warn(`  no match: Blk ${b.block} ${b.streetName}`);
      }
    } catch (err) {
      failed++;
      console.error(`  error on Blk ${b.block} ${b.streetName}: ${err.message}`);
      await sleep(5000);   // back off on errors
    }

    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${pending.length}  (${ok} ok, ${failed} failed)`);
    await sleep(DELAY_MS);
  }

  console.log(`Done. ${ok} geocoded, ${failed} failed.`);
  console.log("Next: npm run walk-times");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
