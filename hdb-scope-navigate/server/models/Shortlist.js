import mongoose from "mongoose";

/** A user's saved blocks. OWNER: Backend & Database */
const shortlistSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  blockRef: { type: mongoose.Schema.Types.ObjectId, ref: "Block", required: true },
  note:     String,
  createdAt: { type: Date, default: Date.now },
});

// Stops the same block being shortlisted twice by the same user.
shortlistSchema.index({ userId: 1, blockRef: 1 }, { unique: true });

export default mongoose.model("Shortlist", shortlistSchema);
