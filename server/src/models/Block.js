import mongoose from 'mongoose';

const flatTypeStatsSchema = new mongoose.Schema(
  {
    flatType: { type: String, required: true },
    medianPrice: Number,
    medianPricePsm: Number,
    medianFloorArea: Number,
    salesLast12m: Number,
    totalSales: Number,
    lastSaleMonth: String,
    lastSalePrice: Number,
    // "last12m" = median of sales in the dataset's latest 12 months, "latest3" = median of the last 3 sales
    priceBasis: { type: String, enum: ['last12m', 'latest3'] },
  },
  { _id: false },
);

// One document per HDB block, with summary prices per flat type. Built by scripts/ingest.js.
const blockSchema = new mongoose.Schema(
  {
    _id: String, // slug, e.g. "406-ang-mo-kio-ave-10"
    block: { type: String, required: true },
    street: { type: String, required: true },
    streetKey: { type: String, required: true }, // street with abbreviations expanded, see lib/streets.js
    town: { type: String, required: true },
    leaseCommenceYear: Number,
    flatTypes: [flatTypeStatsSchema],
    // Filled in lazily by OneMap geocoding the first time the block appears in results
    postal: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number], // [lng, lat]
    },
    geocodeFailed: Boolean,
  },
  { versionKey: false, timestamps: true },
);

blockSchema.index({ streetKey: 1 });
blockSchema.index({ town: 1 });
blockSchema.index({ location: '2dsphere' });

export const Block = mongoose.model('Block', blockSchema);
