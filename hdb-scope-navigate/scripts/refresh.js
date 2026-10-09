/**
 * Weekly top-up: pulls only transactions newer than what we already have.
 * This is where the datastore_search query endpoint earns its place — it's a
 * handful of small requests rather than a full re-download.
 *
 *   npm run refresh
 *
 * OWNER: Data pipeline & QA
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import Block from "../server/models/Block.js";
import Transaction from "../server/models/Transaction.js";
import { query, parseTransaction, blockKey } from "../server/services/datagov.js";
import { statsByFlatType } from "../server/lib/stats.js";

async function main() {
  await connectDb();

  const newest = await Transaction.findOne().sort({ month: -1 }).lean();
  const since = newest?.month ?? "2017-01";
  console.log(`Looking for transactions after ${since}…`);

  const seen = new Set();
  let offset = 0, added = 0;

  while (true) {
    const { records } = await query({ limit: 100, offset, sort: "month desc" });
    if (records.length === 0) break;

    const fresh = records.map(parseTransaction).filter((t) => t.month > since);
    if (fresh.length === 0) break;   // sorted desc, so we're past the new ones

    for (const t of fresh) {
      const key = blockKey(t.block, t.streetName);
      const block = await Block.findOne({ key });
      if (!block) {
        console.warn(`  new block, needs geocoding later: ${key}`);
        continue;
      }
      await Transaction.create({ ...t, blockRef: block._id, blockKey: key });
      seen.add(key);
      added++;
    }

    offset += 100;
    await new Promise((r) => setTimeout(r, 15000));   // 5 requests/min limit
  }

  console.log(`Added ${added} transactions. Recomputing stats for ${seen.size} blocks…`);
  for (const key of seen) {
    const block = await Block.findOne({ key });
    const txns = await Transaction.find({ blockRef: block._id }).lean();
    block.stats = statsByFlatType(txns);
    block.updatedAt = new Date();
    await block.save();
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
