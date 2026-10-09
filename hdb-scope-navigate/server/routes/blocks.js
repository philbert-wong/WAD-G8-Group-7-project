import { Router } from "express";
import Block from "../models/Block.js";
import Transaction from "../models/Transaction.js";
import { blockToApiShape } from "../lib/toApiShape.js";
import { decodePolyline } from "../lib/polyline.js";

/** OWNER: Backend & Database */
const router = Router();

// GET /api/blocks/:id  — the full record, for the detail sidebar and compare view
router.get("/blocks/:id", async (req, res, next) => {
  try {
    const block = await Block.findById(req.params.id).lean();
    if (!block) return res.status(404).json({ error: "Block not found" });

    const transactions = await Transaction.find({ blockRef: block._id })
      .sort({ month: -1 })
      .limit(400)
      .lean();

    // The walk to the MRT: the station, the minutes, and the route as plain
    // [lat, lng] pairs the map can draw directly.
    const mrt = block.nearestMrt?.name ? {
      name: block.nearestMrt.name,
      distanceM: block.nearestMrt.distanceM ?? null,
      walkMinutes: block.nearestMrt.walkMinutes ?? null,
      lat: block.nearestMrt.lat ?? null,
      lng: block.nearestMrt.lng ?? null,
      path: block.nearestMrt.geometry ? decodePolyline(block.nearestMrt.geometry) : null,
    } : null;

    res.json({
      ...blockToApiShape(block),
      postalCode: block.postalCode ?? null,
      nearestMrt: mrt,
      statsByType: block.stats ?? {},
      transactions: transactions.map((t) => ({
        month: t.month,
        flatType: t.flatType,
        storeyRange: t.storeyRange,
        floorAreaSqm: t.floorAreaSqm,
        resalePrice: t.resalePrice,
        pricePsm: t.pricePsm,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
