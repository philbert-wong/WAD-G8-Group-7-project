import mongoose from 'mongoose';

// Fitted regression output from ml-service, stored so Express can serve it without Python running.
//   kind "price-trend": one per (town, flatType)
//   kind "lease-decay": a single island-wide model (town and flatType are null)
const regressionModelSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['price-trend', 'lease-decay'], required: true },
    town: { type: String, default: null },
    flatType: { type: String, default: null },
    n: Number,
    r2: Number,
    result: mongoose.Schema.Types.Mixed,
    fittedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

regressionModelSchema.index({ kind: 1, town: 1, flatType: 1 }, { unique: true });

export const RegressionModel = mongoose.model('RegressionModel', regressionModelSchema);
