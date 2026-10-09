/**
 * REAL SEED — downloads every HDB resale transaction and loads it into MongoDB.
 *
 *   npm run seed
 *
 * Takes a few minutes. Run it once. It does NOT geocode — blocks come out of
 * this script without coordinates, and `npm run geocode` fills those in
 * afterwards (that part takes hours, so it's a separate step you can leave
 * running overnight).
 *
 * OWNER: Data pipeline & QA
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Block from "../server/models/Block.js";
import Transaction from "../server/models/Transaction.js";
import { bulkDownload, parseTransaction, blockKey } from "../server/services/datagov.js";
import { statsByFlatType, remainingLeaseYears } from "../server/lib/stats.js";
import { parseCsv } from "../server/lib/csv.js";

async function main() {
  await connectDb();

  console.log("Asking data.gov.sg to prepare the dataset…");
  const url = await bulkDownload();

  console.log("Downloading…");
  const csv = await (await fetch(url)).text();

  console.log("Parsing…");
  const rows = parseCsv(csv).map(parseTransaction);
  console.log(`${rows.length.toLocaleString()} transactions.`);

  // Group by physical block.
  const byBlock = new Map();
  for (const t of rows) {
    const key = blockKey(t.block, t.streetName);
    if (!byBlock.has(key)) byBlock.set(key, []);
    byBlock.get(key).push(t);
  }
  console.log(`${byBlock.size.toLocaleString()} distinct blocks.`);

  console.log("Clearing old data…");
  await Block.deleteMany({});
  await Transaction.deleteMany({});

  console.log("Writing blocks…");
  let done = 0;
  for (const [key, txns] of byBlock) {
    const first = txns[0];

    // No coordinates yet — scripts/geocode-blocks.js fills these in.
    // We use [0,0] as a marker for "not geocoded". Those blocks never match a
    // $near query near Singapore, so they simply don't appear on the map yet.
    const block = await Block.create({
      key,
      block: first.block,
      streetName: first.streetName,
      town: first.town,
      location: { type: "Point", coordinates: [0, 0] },
      stats: statsByFlatType(txns),
      remainingLeaseYears: remainingLeaseYears(first.leaseCommenceYear),
    });

    await Transaction.insertMany(
      txns.map((t) => ({ ...t, blockRef: block._id, blockKey: key })),
      { ordered: false }
    );

    if (++done % 500 === 0) console.log(`  ${done}/${byBlock.size}`);
  }

  console.log("Done. Next: npm run geocode");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
