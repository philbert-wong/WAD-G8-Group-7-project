import mongoose from "mongoose";

/**
 * Fitted regression results, one document per (scope, town, flat type), so the
 * API serves stored coefficients instead of refitting on every request.
 *   scope "trend": price trend in $/year — town is null for the island-wide fit
 *   scope "lease": $/sqm per remaining lease year — flatType is "ALL"
 * OWNER: Data pipeline & QA
 */
const modelSchema = new mongoose.Schema({
  scope:    { type: String, enum: ["trend", "lease"], required: true },
  town:     { type: String, default: null },
  flatType: { type: String, required: true },
  n:        Number,
  r2:       Number,
  fit:      mongoose.Schema.Types.Mixed,   // everything else the scope produces
  computedAt: { type: Date, default: Date.now },
});

modelSchema.index({ scope: 1, flatType: 1, town: 1 }, { unique: true });

export default mongoose.model("RegressionModel", modelSchema, "models");
