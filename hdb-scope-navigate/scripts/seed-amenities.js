/**
 * Loads the REAL amenities — hawker centres, parks, CHAS clinics, eldercare
 * services and primary schools — from data.gov.sg, then works out how far every
 * block is from each kind.
 *
 *   npm run seed:amenities              # load into MongoDB
 *   npm run seed:amenities -- --dry-run # download + parse + validate, write nothing
 *   npm run seed:amenities -- --no-schools   # skip the (slow) school geocoding
 *
 * Replaces whatever amenities are already there, including the sample ones.
 * Run it after `npm run geocode` so the blocks have coordinates to measure from.
 *
 * Schools arrive with a postal code and no coordinates, so each is geocoded
 * through OneMap (about 180 calls, a few minutes). The other four datasets
 * already carry coordinates. data.gov.sg rate-limits to roughly one download
 * every 10 seconds, so this paces itself.
 *
 * OWNER: Data pipeline & QA
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Amenity from "../server/models/Amenity.js";
import { bulkDownload } from "../server/services/datagov.js";
import { search } from "../server/services/onemap.js";
import { refreshAmenityAccess } from "../server/services/amenityAccess.js";
import { parseCsv } from "../server/lib/csv.js";
import {
  parseHawkers, parseParks, parseClinics, parseEldercare, primarySchools,
} from "../server/lib/amenityParsers.js";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_SCHOOLS = process.argv.includes("--no-schools");
const SCHOOL_LIMIT = Number(process.argv.find((a) => a.startsWith("--school-limit="))?.split("=")[1]) || Infinity;

const DATASETS = {
  hawker:     { id: "d_4a086da0a5553be1d89383cd90d07ecd", kind: "geojson", parse: parseHawkers },
  park:       { id: "d_0542d48f0991541706b58059381a6eca", kind: "geojson", parse: parseParks },
  healthcare: { id: "d_548c33ea2d99e29ec63a7cc9edcccedc", kind: "geojson", parse: parseClinics },
  eldercare:  { id: "d_f0fd1b3643ed8bd34bd403dedd7c1533", kind: "geojson", parse: parseEldercare },
  school:     { id: "d_688b934f82c1059ed0a6993d2a829089", kind: "csv" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** data.gov.sg answers 429 when asked too fast; wait and try again. */
async function download(id) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const url = await bulkDownload({ datasetId: id });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 5) throw err;
      console.log(`   (${err.message}; waiting before retry ${attempt}/4)`);
      await sleep(12000);
    }
  }
}

async function geocodeSchools(schools) {
  const out = [];
  const todo = schools.slice(0, SCHOOL_LIMIT);
  for (const [i, s] of todo.entries()) {
    try {
      const hit = await search(s.postal);
      if (hit) out.push({ type: "school", name: s.name, lat: hit.lat, lng: hit.lng });
      else console.warn(`   no OneMap match for ${s.name} (${s.postal})`);
    } catch (err) {
      console.warn(`   ${s.name}: ${err.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`   ${i + 1}/${todo.length}`);
    await sleep(250);
  }
  return out;
}

async function main() {
  const all = [];

  for (const [type, ds] of Object.entries(DATASETS)) {
    if (type === "school" && SKIP_SCHOOLS) { console.log("school: skipped"); continue; }
    console.log(`${type}: downloading…`);
    const text = await download(ds.id);

    let rows;
    if (ds.kind === "geojson") {
      rows = ds.parse(JSON.parse(text));
    } else {
      const schools = primarySchools(parseCsv(text));
      console.log(`   ${schools.length} primary schools; geocoding via OneMap…`);
      rows = await geocodeSchools(schools);
    }
    console.log(`   ${rows.length} ${type} records`);
    all.push(...rows);
    await sleep(11000);
  }

  // Check every record against the real schema before anything is written.
  const docs = all.map((a) => ({
    type: a.type, name: a.name,
    location: { type: "Point", coordinates: [a.lng, a.lat] },
  }));
  const invalid = docs.filter((d) => new Amenity(d).validateSync());
  if (invalid.length) throw new Error(`${invalid.length} records failed validation, e.g. ${JSON.stringify(invalid[0])}`);
  console.log(`${docs.length} amenities valid.`);

  if (DRY_RUN) {
    console.log("Dry run — nothing written.");
    return;
  }

  await connectDb();
  await Amenity.deleteMany({});
  await Amenity.insertMany(docs);
  console.log(`Saved ${docs.length} amenities. Measuring distances from every block…`);
  const { blocks } = await refreshAmenityAccess();
  console.log(`Updated ${blocks.toLocaleString()} blocks. Done.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
