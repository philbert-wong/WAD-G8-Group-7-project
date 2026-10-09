import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDb } from "./config/db.js";
import geocodeRoutes from "./routes/geocode.js";
import listingsRoutes from "./routes/listings.js";
import blocksRoutes from "./routes/blocks.js";
import authRoutes from "./routes/auth.js";
import shortlistRoutes from "./routes/shortlist.js";
import amenitiesRoutes from "./routes/amenities.js";
import trendsRoutes from "./routes/trends.js";
import grantsRoutes from "./routes/grants.js";
import preferencesRoutes from "./routes/preferences.js";

/**
 * OWNER: Project Lead — this file wires everyone's work together.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// --- the kitchen: everyone's routes live under /api ---
app.use("/api", geocodeRoutes);
app.use("/api", listingsRoutes);
app.use("/api", blocksRoutes);
app.use("/api", authRoutes);
app.use("/api", shortlistRoutes);
app.use("/api", amenitiesRoutes);
app.use("/api", trendsRoutes);
app.use("/api", grantsRoutes);
app.use("/api", preferencesRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- the dining room: serve the built Vue app in production ---
// In development you run Vite separately on :5173 and it proxies /api here.
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built yet. Run: npm run build");
  });
});

// One error handler for the whole app. Never leak a stack trace to the browser.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side" });
});

const PORT = process.env.PORT || 3000;

connectDb()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Could not start:", err.message);
    process.exit(1);
  });

export default app;
