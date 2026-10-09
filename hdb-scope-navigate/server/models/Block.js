import mongoose from "mongoose";

/**
 * One document per physical HDB block. This is the collection the map queries,
 * so it holds pre-computed summaries rather than raw transactions.
 * OWNER: Backend & Database
 */
const blockSchema = new mongoose.Schema({
  key:        { type: String, required: true, unique: true }, // "406|ANG MO KIO AVE 10"
  block:      { type: String, required: true },
  streetName: { type: String, required: true },
  town:       { type: String, required: true, index: true },
  postalCode: String,

  // GeoJSON. NOTE THE ORDER: [longitude, latitude]. Getting this backwards puts
  // every flat in Singapore somewhere off the coast of Somalia.
  location: {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },

  nearestMrt: {
    name:       String,
    distanceM:  Number,
    walkMinutes: Number,
    geometry:   String,   // encoded polyline from OneMap
    lat:        Number,   // the station itself, so the map can draw the walk
    lng:        Number,
  },

  // Nearest amenity of each kind, in metres. Pre-computed by
  // scripts/compute-amenity-access.js so the personal score never needs a query.
  amenityAccess: {
    school:     Number,
    park:       Number,
    hawker:     Number,
    healthcare: Number,
    eldercare:  Number,
  },

  // Pre-computed per flat type: { "4 ROOM": { medianPrice, medianPsm, txnCount } }
  stats: { type: Map, of: new mongoose.Schema({
    medianPrice: Number,
    medianPsm:   Number,
    txnCount:    Number,
    lastTxnMonth: String,
  }, { _id: false }) },

  remainingLeaseYears: Number,
  updatedAt: { type: Date, default: Date.now },
});

// The single most important index in the project — powers "blocks near this point".
blockSchema.index({ location: "2dsphere" });

export default mongoose.model("Block", blockSchema);
