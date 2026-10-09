import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

/** Saved filters, score weights and layer toggles. OWNER: Backend & Database */
const router = Router();

router.get("/me/preferences", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub, "preferences").lean();
    res.json(user?.preferences ?? {});
  } catch (err) { next(err); }
});

router.put("/me/preferences", requireAuth, async (req, res, next) => {
  try {
    const prefs = req.body;
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
      return res.status(400).json({ error: "Send the preferences as an object" });
    }
    if (JSON.stringify(prefs).length > 4000) {
      return res.status(413).json({ error: "Preferences are too large" });
    }
    await User.updateOne({ _id: req.user.sub }, { preferences: prefs });
    res.json(prefs);
  } catch (err) { next(err); }
});

export default router;
