import { Router } from "express";
import * as onemap from "../services/onemap.js";

/** OWNER: Backend & Database (calls the Maps service) */
const router = Router();

// GET /api/geocode?q=560406
router.get("/geocode", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Type a postal code or address" });

    const result = await onemap.search(q);
    if (!result) return res.status(404).json({ error: `Couldn't find "${q}"` });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
