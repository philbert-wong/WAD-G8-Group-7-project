/**
 * Writes the grant and loan rules into MongoDB so the affordability calculator
 * can read them. Edit server/lib/grantDefaults.js when HDB changes its rules,
 * then run this again.
 *
 *   npm run seed:grants
 *
 * OWNER: Backend & Database
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import GrantRule from "../server/models/GrantRule.js";
import { GRANT_DEFAULTS } from "../server/lib/grantDefaults.js";

async function main() {
  await connectDb();
  await GrantRule.findOneAndUpdate(
    { key: GRANT_DEFAULTS.key },
    { data: GRANT_DEFAULTS, updatedAt: new Date() },
    { upsert: true }
  );
  console.log(`Grant rules saved (as of ${GRANT_DEFAULTS.asOf}).`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
