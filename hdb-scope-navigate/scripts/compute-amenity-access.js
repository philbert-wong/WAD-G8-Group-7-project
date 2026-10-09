/**
 * For every block, finds the nearest school, park, hawker centre, clinic and
 * eldercare service and stores the distance on the block. The personal score and
 * the sidebar's "access" bars read these numbers.
 *
 *   npm run amenity-access
 *
 * Run after the amenities have been loaded and the blocks geocoded.
 *
 * OWNER: Maps & Location
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../server/config/db.js";
import { refreshAmenityAccess } from "../server/services/amenityAccess.js";

async function main() {
  await connectDb();
  const { blocks, amenities } = await refreshAmenityAccess();
  if (!amenities) console.log("No amenities in the database yet.");
  else console.log(`Updated ${blocks.toLocaleString()} blocks against ${amenities.toLocaleString()} amenities.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
