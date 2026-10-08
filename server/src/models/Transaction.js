import mongoose from 'mongoose';

// One document per HDB resale transaction (data.gov.sg, Jan 2017 onwards).
const transactionSchema = new mongoose.Schema(
  {
    blockId: { type: String, required: true },
    town: { type: String, required: true },
    flatType: { type: String, required: true },
    block: { type: String, required: true },
    street: { type: String, required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    t: { type: Number, required: true }, // years since Jan 2017, used by the regression
    storeyRange: String,
    storeyMid: Number,
    floorArea: Number,
    flatModel: String,
    leaseCommenceYear: Number,
    remainingLease: Number, // years left at the time of sale
    price: { type: Number, required: true },
    pricePsm: Number,
  },
  { versionKey: false },
);

transactionSchema.index({ blockId: 1, month: 1 });
transactionSchema.index({ town: 1, flatType: 1 });
transactionSchema.index({ month: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
