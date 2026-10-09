/**
 * SAMPLE SEED — run this on day one so the app works before anyone has
 * downloaded 240,000 rows or waited for geocoding.
 *
 *   npm run seed:sample
 *
 * ⚠️  THE PRICES, TRANSACTIONS AND AMENITIES BELOW ARE INVENTED. They are
 *     plausible but they are not real HDB data. Their only job is to let every
 *     feature — map, filters, score, trends, lease decay, shortlist — be built
 *     and demonstrated while the real pipeline is still being written. Run
 *     `npm run seed` for the real thing, and never show this data in your final demo.
 *
 * Prices are generated from a simple rule (town premium + lease + storey + a
 * steady rise over time + noise) so the regression models have something real
 * to find. Coordinates are approximate real locations so the map looks sensible.
 *
 * OWNER: Data pipeline & QA
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Block from "../server/models/Block.js";
import Transaction from "../server/models/Transaction.js";
import Amenity from "../server/models/Amenity.js";
import GrantRule from "../server/models/GrantRule.js";
import RegressionModel from "../server/models/RegressionModel.js";
import { blockKey } from "../server/services/datagov.js";
import { statsByFlatType, remainingLeaseYears } from "../server/lib/stats.js";
import { saleTime } from "../server/lib/trends.js";
import { encodePolyline } from "../server/lib/polyline.js";
import { GRANT_DEFAULTS } from "../server/lib/grantDefaults.js";
import { fitAllModels } from "../server/services/models.js";
import { refreshAmenityAccess } from "../server/services/amenityAccess.js";

const STATIONS = {
  "Ang Mo Kio": [1.3700, 103.8495], "Bishan": [1.3512, 103.8485], "Toa Payoh": [1.3327, 103.8474],
  "Braddell": [1.3404, 103.8469], "Clementi": [1.3151, 103.7653], "Bedok": [1.3240, 103.9300],
  "Serangoon": [1.3497, 103.8734], "Pioneer": [1.3376, 103.6974], "Queenstown": [1.2943, 103.8059],
  "Tampines": [1.3545, 103.9453], "Woodlands": [1.4370, 103.7865], "Punggol": [1.4053, 103.9023],
  "Hougang": [1.3712, 103.8924], "Yishun": [1.4294, 103.8350], "Sengkang": [1.3917, 103.8953],
  "Boon Keng": [1.3196, 103.8618], "Tiong Bahru": [1.2862, 103.8270], "Pasir Ris": [1.3730, 103.9493],
};

const SAMPLE_BLOCKS = [
  { block: "406", streetName: "ANG MO KIO AVE 10",  town: "ANG MO KIO",  lng: 103.8540, lat: 1.3620, mrt: "Ang Mo Kio", walk: 8,  lease: 1979 },
  { block: "215", streetName: "ANG MO KIO AVE 1",   town: "ANG MO KIO",  lng: 103.8398, lat: 1.3691, mrt: "Ang Mo Kio", walk: 4,  lease: 1977 },
  { block: "534", streetName: "ANG MO KIO AVE 10",  town: "ANG MO KIO",  lng: 103.8571, lat: 1.3705, mrt: "Ang Mo Kio", walk: 12, lease: 1980 },
  { block: "117", streetName: "BISHAN ST 12",       town: "BISHAN",      lng: 103.8483, lat: 1.3505, mrt: "Bishan",     walk: 6,  lease: 1987 },
  { block: "153", streetName: "BISHAN ST 13",       town: "BISHAN",      lng: 103.8531, lat: 1.3470, mrt: "Bishan",     walk: 9,  lease: 1988 },
  { block: "230", streetName: "BISHAN ST 23",       town: "BISHAN",      lng: 103.8402, lat: 1.3572, mrt: "Bishan",     walk: 14, lease: 1992 },
  { block: "79",  streetName: "TOA PAYOH CTRL",     town: "TOA PAYOH",   lng: 103.8479, lat: 1.3327, mrt: "Toa Payoh",  walk: 3,  lease: 1972 },
  { block: "138", streetName: "LOR 1A TOA PAYOH",   town: "TOA PAYOH",   lng: 103.8446, lat: 1.3378, mrt: "Toa Payoh",  walk: 7,  lease: 1970 },
  { block: "220", streetName: "LOR 8 TOA PAYOH",    town: "TOA PAYOH",   lng: 103.8563, lat: 1.3400, mrt: "Braddell",   walk: 11, lease: 1975 },
  { block: "612", streetName: "CLEMENTI WEST ST 1", town: "CLEMENTI",    lng: 103.7647, lat: 1.3057, mrt: "Clementi",   walk: 10, lease: 1981 },
  { block: "352", streetName: "CLEMENTI AVE 2",     town: "CLEMENTI",    lng: 103.7713, lat: 1.3157, mrt: "Clementi",   walk: 5,  lease: 1979 },
  { block: "128", streetName: "BEDOK NTH ST 2",     town: "BEDOK",       lng: 103.9330, lat: 1.3283, mrt: "Bedok",      walk: 7,  lease: 1978 },
  { block: "416", streetName: "BEDOK NTH AVE 2",    town: "BEDOK",       lng: 103.9391, lat: 1.3306, mrt: "Bedok",      walk: 13, lease: 1980 },
  { block: "682", streetName: "JURONG WEST ST 64",  town: "JURONG WEST", lng: 103.6975, lat: 1.3438, mrt: "Pioneer",    walk: 9,  lease: 1993 },
  { block: "265", streetName: "SERANGOON CTRL DR",  town: "SERANGOON",   lng: 103.8734, lat: 1.3512, mrt: "Serangoon",  walk: 6,  lease: 1985 },
  { block: "168", streetName: "STIRLING RD",        town: "QUEENSTOWN",  lng: 103.8030, lat: 1.2945, mrt: "Queenstown", walk: 6,  lease: 1975 },
  { block: "82",  streetName: "COMMONWEALTH CRES",  town: "QUEENSTOWN",  lng: 103.7990, lat: 1.3010, mrt: "Queenstown", walk: 15, lease: 1971 },
  { block: "823", streetName: "TAMPINES ST 81",     town: "TAMPINES",    lng: 103.9390, lat: 1.3560, mrt: "Tampines",   walk: 9,  lease: 1988 },
  { block: "475", streetName: "TAMPINES ST 44",     town: "TAMPINES",    lng: 103.9535, lat: 1.3515, mrt: "Tampines",   walk: 14, lease: 1991 },
  { block: "886", streetName: "WOODLANDS DR 50",    town: "WOODLANDS",   lng: 103.7890, lat: 1.4310, mrt: "Woodlands",  walk: 11, lease: 1998 },
  { block: "310", streetName: "PUNGGOL WALK",       town: "PUNGGOL",     lng: 103.9020, lat: 1.4060, mrt: "Punggol",    walk: 4,  lease: 2013 },
  { block: "187", streetName: "PUNGGOL FIELD",      town: "PUNGGOL",     lng: 103.9100, lat: 1.3990, mrt: "Punggol",    walk: 12, lease: 2011 },
  { block: "123", streetName: "HOUGANG AVE 1",      town: "HOUGANG",     lng: 103.8890, lat: 1.3610, mrt: "Hougang",    walk: 13, lease: 1983 },
  { block: "745", streetName: "YISHUN ST 72",       town: "YISHUN",      lng: 103.8350, lat: 1.4250, mrt: "Yishun",     walk: 8,  lease: 1988 },
  { block: "280", streetName: "COMPASSVALE LINK",   town: "SENGKANG",    lng: 103.8970, lat: 1.3930, mrt: "Sengkang",   walk: 5,  lease: 2001 },
  { block: "38",  streetName: "JLN BAHAGIA",        town: "KALLANG/WHAMPOA", lng: 103.8570, lat: 1.3235, mrt: "Boon Keng", walk: 7, lease: 1973 },
  { block: "53",  streetName: "TIONG BAHRU RD",     town: "BUKIT MERAH", lng: 103.8320, lat: 1.2862, mrt: "Tiong Bahru", walk: 4, lease: 1969 },
  { block: "262", streetName: "PASIR RIS ST 21",    town: "PASIR RIS",   lng: 103.9490, lat: 1.3720, mrt: "Pasir Ris",  walk: 6,  lease: 1989 },
];

const FLAT_TYPES = [
  { type: "2 ROOM",    sqm: 45,  base: 300000 },
  { type: "3 ROOM",    sqm: 68,  base: 390000 },
  { type: "4 ROOM",    sqm: 92,  base: 520000 },
  { type: "5 ROOM",    sqm: 113, base: 650000 },
  { type: "EXECUTIVE", sqm: 130, base: 790000 },
];

const TOWN_PREMIUM = {
  "BISHAN": 90000, "QUEENSTOWN": 120000, "BUKIT MERAH": 110000, "CLEMENTI": 60000,
  "TOA PAYOH": 50000, "KALLANG/WHAMPOA": 60000, "TAMPINES": 20000, "PUNGGOL": 30000,
  "SERANGOON": 40000, "WOODLANDS": -40000, "YISHUN": -30000, "JURONG WEST": -20000,
};

const STOREYS = ["01 TO 03", "04 TO 06", "07 TO 09", "10 TO 12", "13 TO 15", "16 TO 18"];
const STOREY_MID = [2, 5, 8, 11, 14, 17];

// Deterministic, so every teammate seeds identical data.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTransactions(spec, index) {
  const rand = seededRandom(index + 1);
  const rows = [];
  const premium = TOWN_PREMIUM[spec.town] ?? 0;

  for (const ft of FLAT_TYPES) {
    const scale = ft.sqm / 92;
    const count = 11 + Math.floor(rand() * 6);

    for (let i = 0; i < count; i++) {
      // Sales spread over Jan 2022 – Sep 2026.
      const monthsAgo = Math.floor(rand() * 57);
      const d = new Date(2026, 8 - monthsAgo, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const storeyIdx = Math.floor(rand() * STOREYS.length);
      const leaseLeft = 99 - (saleTime(month) - spec.lease);

      const price =
        ft.base +
        premium * scale +
        (leaseLeft - 60) * 2300 * scale +        // each lease year is worth ~$2.3k on a 4-room
        (STOREY_MID[storeyIdx] - 8) * 3500 * scale +
        (57 - monthsAgo) / 12 * 14000 * scale +  // ≈ $14k a year of drift on a 4-room
        (rand() - 0.5) * 50000 * scale;
      const resalePrice = Math.max(200000, Math.round(price / 1000) * 1000);

      rows.push({
        blockKey: blockKey(spec.block, spec.streetName),
        month,
        town: spec.town,
        flatType: ft.type,
        block: spec.block,
        streetName: spec.streetName,
        storeyRange: STOREYS[storeyIdx],
        floorAreaSqm: ft.sqm,
        flatModel: "Improved",
        leaseCommenceYear: spec.lease,
        remainingLeaseYears: Math.round(leaseLeft * 100) / 100,
        resalePrice,
        pricePsm: Math.round(resalePrice / ft.sqm),
      });
    }
  }
  return rows;
}

const AMENITY_NAMES = {
  school: "Primary School", park: "Park", hawker: "Hawker Centre",
  healthcare: "CHAS Clinic", eldercare: "Eldercare Centre",
};

/** Scatter a few invented amenities around each block: 120 m to 1.5 km away. */
function makeAmenities() {
  const rand = seededRandom(9001);
  const out = [];
  let n = 0;

  for (const spec of SAMPLE_BLOCKS) {
    const counts = { school: 1 + (rand() > 0.5), park: 1 + (rand() > 0.6), hawker: rand() > 0.35 ? 1 : 0,
      healthcare: 1 + Math.floor(rand() * 3), eldercare: rand() > 0.5 ? 1 : 0 };

    for (const [type, count] of Object.entries(counts)) {
      for (let i = 0; i < count; i++) {
        const bearing = rand() * 2 * Math.PI;
        const metres = 120 + rand() * 1380;
        const dLat = (metres * Math.cos(bearing)) / 111320;
        const dLng = (metres * Math.sin(bearing)) / (111320 * Math.cos((spec.lat * Math.PI) / 180));
        out.push({
          type,
          name: `Sample ${AMENITY_NAMES[type]} ${++n}`,
          location: { type: "Point", coordinates: [spec.lng + dLng, spec.lat + dLat] },
        });
      }
    }
  }
  return out;
}

async function main() {
  await connectDb();

  console.log("Clearing existing sample data…");
  await Promise.all([Block.deleteMany({}), Transaction.deleteMany({}),
    Amenity.deleteMany({}), RegressionModel.deleteMany({})]);

  let totalTxns = 0;

  for (const [i, spec] of SAMPLE_BLOCKS.entries()) {
    const txns = makeTransactions(spec, i);
    const [stLat, stLng] = STATIONS[spec.mrt];

    const block = await Block.create({
      key: blockKey(spec.block, spec.streetName),
      block: spec.block,
      streetName: spec.streetName,
      town: spec.town,
      location: { type: "Point", coordinates: [spec.lng, spec.lat] },
      nearestMrt: {
        name: spec.mrt, distanceM: spec.walk * 80, walkMinutes: spec.walk, lat: stLat, lng: stLng,
        // A straight line stands in for the real OneMap route, which `npm run walk-times` fetches.
        geometry: encodePolyline([[spec.lat, spec.lng], [stLat, stLng]]),
      },
      stats: statsByFlatType(txns),
      remainingLeaseYears: remainingLeaseYears(spec.lease),
    });

    await Transaction.insertMany(txns.map((t) => ({ ...t, blockRef: block._id })));
    totalTxns += txns.length;
  }

  const amenities = makeAmenities();
  await Amenity.insertMany(amenities);
  const access = await refreshAmenityAccess();

  await GrantRule.findOneAndUpdate(
    { key: GRANT_DEFAULTS.key },
    { data: GRANT_DEFAULTS, updatedAt: new Date() },
    { upsert: true }
  );

  console.log("Fitting regression models…");
  const fit = await fitAllModels();

  console.log(`Done. ${SAMPLE_BLOCKS.length} blocks, ${totalTxns} transactions, ` +
    `${amenities.length} amenities (access computed for ${access.blocks} blocks), ${fit.models} models.`);
  console.log("Remember: this data is INVENTED. Run `npm run seed` for real HDB data.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
