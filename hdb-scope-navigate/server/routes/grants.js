import { Router } from "express";
import GrantRule from "../models/GrantRule.js";
import { GRANT_DEFAULTS } from "../lib/grantDefaults.js";

/** OWNER: Backend & Database */
const router = Router();

// GET /api/grants — the rules the affordability calculator runs on
router.get("/grants", async (_req, res, next) => {
  try {
    const row = await GrantRule.findOne({ key: GRANT_DEFAULTS.key }).lean();
    res.json(row?.data ?? GRANT_DEFAULTS);
  } catch (err) { next(err); }
});

export default router;
