import { Router } from "express";
import RegressionModel from "../models/RegressionModel.js";
import { ensureModels } from "../services/models.js";

/** OWNER: Data pipeline & QA (served by Backend) */
const router = Router();

const flat = (d) => ({ town: d.town, flatType: d.flatType, n: d.n, r2: d.r2, ...d.fit });

// GET /api/trends?flatType=4 ROOM — trend per town plus the island-wide fit
router.get("/trends", async (req, res, next) => {
  try {
    await ensureModels();

    const available = (await RegressionModel.distinct("flatType", { scope: "trend" })).sort();
    const flatType = req.query.flatType || available.find((t) => t === "4 ROOM") || available[0];
    if (!flatType) return res.json({ flatType: null, available, island: null, towns: [] });

    const docs = await RegressionModel.find({ scope: "trend", flatType }).lean();
    const island = docs.find((d) => d.town == null);
    const towns = docs.filter((d) => d.town != null).map(flat)
      .sort((a, b) => b.trendPerYear - a.trendPerYear);

    res.json({ flatType, available, island: island ? flat(island) : null, towns });
  } catch (err) { next(err); }
});

// GET /api/trends/lease — what one more year of remaining lease is worth per sqm
router.get("/trends/lease", async (_req, res, next) => {
  try {
    await ensureModels();
    const doc = await RegressionModel.findOne({ scope: "lease" }).lean();
    if (!doc) return res.status(404).json({ error: "Not enough data to fit a lease model yet" });
    res.json(flat(doc));
  } catch (err) { next(err); }
});

export default router;
