import mongoose from "mongoose";

/** Current HDB grant amounts and income ceilings. OWNER: Backend & Database */
const grantRuleSchema = new mongoose.Schema({
  key:  { type: String, required: true, unique: true },
  data: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("GrantRule", grantRuleSchema);
