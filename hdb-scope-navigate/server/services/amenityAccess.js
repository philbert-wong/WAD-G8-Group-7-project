import Block from "../models/Block.js";
import Amenity from "../models/Amenity.js";
import { nearestByType } from "../lib/geo.js";

/**
 * Works out, for every geocoded block, the distance to the nearest amenity of
 * each kind and stores it on the block. Runs offline (seed / script), never per
 * request. Straight-line distance: amenity access doesn't need walking routes.
 * OWNER: Maps & Location
 */
export async function refreshAmenityAccess() {
  const amenities = (await Amenity.find({}, "type location").lean()).map((a) => ({
    type: a.type, lng: a.location.coordinates[0], lat: a.location.coordinates[1],
  }));
  if (amenities.length === 0) return { blocks: 0, amenities: 0 };

  const blocks = await Block.find({ "location.coordinates": { $ne: [0, 0] } }, "location").lean();
  const ops = blocks.map((b) => ({
    updateOne: {
      filter: { _id: b._id },
      update: { $set: { amenityAccess: nearestByType(
        { lng: b.location.coordinates[0], lat: b.location.coordinates[1] }, amenities) } },
    },
  }));
  if (ops.length) await Block.bulkWrite(ops);

  return { blocks: blocks.length, amenities: amenities.length };
}
