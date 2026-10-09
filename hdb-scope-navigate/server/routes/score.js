/**
 * SKELETON (only if you decide the score belongs on the server) — write this file.
 * OWNER: me.   NOT mounted anywhere yet, so it changes nothing until you wire it in.
 * ─────────────────────────────────────────────────────────────────────
 * THE DECISION FIRST (write the answer in my-work/checklist.md)
 *   Today the score is computed in the BROWSER (client/src/lib/score.js) so the
 *   sliders respond instantly with no request per drag. If you keep it there,
 *   you don't need this file — and that is a legitimate answer.
 *   A server version makes sense if you want it to: sort and page a big result,
 *   keep the formula private, or score for other clients (e.g. a mobile app).
 *
 * IF YOU BUILD IT — suggested endpoint
 *   POST /api/score
 *   body:     { weights: { transport: 5, food: 3, ... }, blockIds: ["...", "..."] }
 *   response: { scores: [ { id: "...", score: 87 }, ... ] }
 *
 * STEPS
 *   1. Make sure server/lib/score.js exists (copy your passing Exercise 3 there).
 *   2. Import { personalScore } from "../lib/score.js", Block from "../models/Block.js",
 *      and blockToApiShape from "../lib/toApiShape.js".
 *   3. router.post("/score", ...):
 *        a. Read weights and blockIds from req.body.
 *        b. 400 if weights isn't an object, or blockIds isn't an array, or has > 500 ids.
 *        c. Find the blocks:  Block.find({ _id: { $in: blockIds } }).lean()
 *        d. For each, shape it with blockToApiShape, then personalScore(shaped, weights).
 *        e. Respond with { scores }.
 *   4. Mount it in createApp.js:   app.use("/api", scoreRoutes);
 *   5. Add the call in the client (client/src/api/score.js) and a line to the README contract.
 *   6. Write tests/api/score.test.js.
 */
import { Router } from "express";

const router = Router();

// TODO: router.post("/score", ...)

export default router;
