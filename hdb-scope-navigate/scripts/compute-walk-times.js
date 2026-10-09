/**
 * Works out the real walking time from each block to its nearest MRT station.
 *
 *   npm run walk-times
 *
 * Straight-line distance is misleading in Singapore — canals and expressways
 * routinely double the actual walk — so we ask OneMap for a real walking route.
 * Results are cached on the block forever: a walk doesn't change.
 *
 * Also slow. Run it after geocoding.
 *
 * OWNER: Maps & Location
 *
 * TODO: replace STATIONS with the full list from LTA DataMall.
 * This short list is enough to build and test against.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Block from "../server/models/Block.js";
import { route } from "../server/services/onemap.js";

const STATIONS = [
  { name: "Ang Mo Kio", lat: 1.3700, lng: 103.8495 },
  { name: "Bishan",     lat: 1.3512, lng: 103.8485 },
  { name: "Toa Payoh",  lat: 1.3327, lng: 103.8474 },
  { name: "Braddell",   lat: 1.3404, lng: 103.8469 },
  { name: "Clementi",   lat: 1.3151, lng: 103.7653 },
  { name: "Bedok",      lat: 1.3240, lng: 103.9300 },
  { name: "Serangoon",  lat: 1.3497, lng: 103.8734 },
  { name: "Pioneer",    lat: 1.3376, lng: 103.6974 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Rough straight-line distance, used only to pick candidates cheaply. */
function haversineM(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function main() {
  await connectDb();

  const blocks = await Block.find({
    "nearestMrt.walkMinutes": { $exists: false },
    "location.coordinates": { $ne: [0, 0] },
  });
  console.log(`${blocks.length} blocks need walk times.`);

  for (const [i, b] of blocks.entries()) {
    const [lng, lat] = b.location.coordinates;
    const from = { lat, lng };

    // Only route to the 2 closest candidates — routing every station would be
    // 8x the API calls for the same answer.
    const candidates = STATIONS
      .map((s) => ({ ...s, rough: haversineM(from, s) }))
      .sort((x, y) => x.rough - y.rough)
      .slice(0, 2);

    let best = null;
    for (const s of candidates) {
      try {
        const r = await route(from, s, "walk");
        if (r && (!best || r.durationS < best.durationS)) {
          best = { ...r, name: s.name };
        }
      } catch (err) {
        console.error(`  ${b.block} ${b.streetName} → ${s.name}: ${err.message}`);
      }
      await sleep(1000);
    }

    if (best) {
      b.nearestMrt = {
        name: best.name,
        distanceM: best.distanceM,
        walkMinutes: best.walkMinutes,
        geometry: best.geometry,
        lat: best.lat,
        lng: best.lng,
      };
      await b.save();
    }

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${blocks.length}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
