import { Router } from "express";
import Shortlist from "../models/Shortlist.js";
import Block from "../models/Block.js";
import { requireAuth } from "../middleware/auth.js";
import { blockToApiShape } from "../lib/toApiShape.js";

/** OWNER: Backend & Database — this is the CRUD the rubric asks for */
const router = Router();

router.get("/shortlist", requireAuth, async (req, res, next) => {
  try {
    const rows = await Shortlist.find({ userId: req.user.sub }).populate("blockRef");
    res.json(rows.map((r) => ({
      id: String(r._id),
      note: r.note,
      block: r.blockRef ? blockToApiShape(r.blockRef) : null,
    })));
  } catch (err) { next(err); }
});

router.post("/shortlist", requireAuth, async (req, res, next) => {
  try {
    const { blockId, note } = req.body || {};
    if (!await Block.exists({ _id: blockId })) {
      return res.status(404).json({ error: "Block not found" });
    }
    const row = await Shortlist.create({ userId: req.user.sub, blockRef: blockId, note });
    res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "That block is already on your shortlist" });
    }
    next(err);
  }
});

router.patch("/shortlist/:id", requireAuth, async (req, res, next) => {
  try {
    const row = await Shortlist.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },   // scoped to the owner
      { note: req.body?.note },
      { new: true }
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id: String(row._id), note: row.note });
  } catch (err) { next(err); }
});

router.delete("/shortlist/:id", requireAuth, async (req, res, next) => {
  try {
    const row = await Shortlist.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
