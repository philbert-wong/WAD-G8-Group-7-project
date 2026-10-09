/**
 * Refits the price-trend and lease-decay regressions and stores the coefficients.
 *
 *   npm run fit-models
 *
 * Run after `npm run seed` and after `npm run refresh`. Pure maths over the
 * Transactions collection — no network, a few seconds on the full dataset.
 *
 * OWNER: Data pipeline & QA
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import { fitAllModels } from "../server/services/models.js";

async function main() {
  await connectDb();
  const { transactions, models } = await fitAllModels();
  console.log(`Fitted ${models} models from ${transactions.toLocaleString()} transactions.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
