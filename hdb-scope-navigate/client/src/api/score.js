/**
 * SKELETON (only if you build server/routes/score.js) — write this file.
 * OWNER: me — this is the "API integration" half: the ONE place the browser
 * calls the score endpoint. No component calls axios directly.
 * ─────────────────────────────────────────────────────────────────────
 * Follow the pattern of client/src/api/trends.js:
 *     import api from "./client.js";
 *     export async function fetchTrends(flatType) {
 *       const { data } = await api.get("/trends", { params: ... });
 *       return data;
 *     }
 *
 * STEPS
 *   1. import api from "./client.js";   (it already attaches the login token)
 *   2. export async function fetchScores(blockIds, weights)
 *   3. POST to "/score" with { blockIds, weights }
 *   4. return data.scores
 *   5. Use it from a store (not a component). Which store?  Hint: stores/listings.js
 *      already owns "the blocks on the map" and the current weights live in stores/score.js.
 */
export async function fetchScores(blockIds, weights) {
  // TODO: steps 1–4.
  throw new Error("Not written yet");
}
