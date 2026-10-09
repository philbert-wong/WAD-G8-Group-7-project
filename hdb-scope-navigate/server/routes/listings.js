import { Router } from "express";
import Block from "../models/Block.js";
import { blockToApiShape } from "../lib/toApiShape.js";

/** OWNER: Backend & Database */
const router = Router();

const ISLAND_CAP = 12000;   // every HDB block with a resale record is ~10,000
const NEAR_CAP = 300;       // "near this point" is a short list, sorted by distance

/**
 * GET /api/listings?lat=&lng=&radius=&flatType=&town=&maxPrice=&minLease=&maxWalkMin=
 *
 * With lat, lng and a radius it is a $near query (Block has a 2dsphere index, so
 * MongoDB sorts by distance for us). Without them it searches the whole island,
 * which is what the "filter every block at once" feature needs.
 */
router.get("/listings", async (req, res, next) => {
  try {
    const lat = req.query.lat === undefined ? NaN : Number(req.query.lat);
    const lng = req.query.lng === undefined ? NaN : Number(req.query.lng);
    const radius = Number(req.query.radius) || 0;           // metres; 0 = whole island
    const near = radius > 0 && Number.isFinite(lat) && Number.isFinite(lng);

    const flatType   = req.query.flatType || null;
    const town       = req.query.town ? String(req.query.town).toUpperCase() : null;
    const maxPrice   = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const minLease   = req.query.minLease ? Number(req.query.minLease) : null;
    const maxWalkMin = req.query.maxWalkMin ? Number(req.query.maxWalkMin) : null;

    // [0,0] is how the seed marks "not geocoded yet" — keep those off the map.
    const filter = { "location.coordinates": { $ne: [0, 0] } };

    if (near) {
      filter.location = {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius },
      };
    }
    if (town)       filter.town = town;
    if (minLease)   filter.remainingLeaseYears = { $gte: minLease };
    if (maxWalkMin) filter["nearestMrt.walkMinutes"] = { $lte: maxWalkMin };
    if (flatType)   filter[`stats.${flatType}`] = { $exists: true };
    if (maxPrice && flatType) filter[`stats.${flatType}.medianPrice`] = { $lte: maxPrice };

    const docs = await Block.find(filter)
      .select("-nearestMrt.geometry")      // long strings the map never draws
      .limit(near ? NEAR_CAP : ISLAND_CAP)
      .lean();

    let blocks = docs.map((d) => blockToApiShape(d, { flatType }));

    // With no flat type chosen, "the price" depends on which type we picked, so
    // the budget can only be applied after shaping.
    if (maxPrice && !flatType) {
      blocks = blocks.filter((b) => b.medianPrice != null && b.medianPrice <= maxPrice);
    }

    res.json({ count: blocks.length, blocks });
  } catch (err) {
    next(err);
  }
});

export default router;
