import { Router } from "express";
import Amenity from "../models/Amenity.js";

/** OWNER: Maps & Location */
const router = Router();
const TYPES = ["school", "park", "hawker", "healthcare", "eldercare"];

/**
 * GET /api/amenities?types=school,park&west=&south=&east=&north=
 * Amenities inside the visible part of the map, so we never ship the whole country.
 */
router.get("/amenities", async (req, res, next) => {
  try {
    const types = String(req.query.types || "").split(",").filter((t) => TYPES.includes(t));
    if (types.length === 0) return res.json({ amenities: [] });

    const [west, south, east, north] = ["west", "south", "east", "north"].map((k) => Number(req.query[k]));
    if (![west, south, east, north].every(Number.isFinite)) {
      return res.status(400).json({ error: "west, south, east and north are required" });
    }

    const docs = await Amenity.find({
      type: { $in: types },
      location: { $geoWithin: { $box: [[west, south], [east, north]] } },
    }).limit(2500).lean();

    res.json({
      amenities: docs.map((a) => ({
        id: String(a._id), type: a.type, name: a.name,
        lat: a.location.coordinates[1], lng: a.location.coordinates[0],
      })),
    });
  } catch (err) { next(err); }
});

export default router;
