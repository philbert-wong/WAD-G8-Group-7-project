import mongoose from "mongoose";

/** One document per resale transaction, as published. OWNER: Backend & Database */
const transactionSchema = new mongoose.Schema({
  blockRef:  { type: mongoose.Schema.Types.ObjectId, ref: "Block", index: true },
  blockKey:  { type: String, index: true },
  month:     { type: String, index: true },   // "2026-08"
  town:      String,
  flatType:  String,
  block:     String,
  streetName: String,
  storeyRange: String,
  floorAreaSqm: Number,
  flatModel: String,
  leaseCommenceYear: Number,
  remainingLeaseYears: Number,
  resalePrice: Number,
  pricePsm:  Number,
});

transactionSchema.index({ town: 1, flatType: 1 });
transactionSchema.index({ month: -1 });

export default mongoose.model("Transaction", transactionSchema);
