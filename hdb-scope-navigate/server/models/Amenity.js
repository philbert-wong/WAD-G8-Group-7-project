import mongoose from "mongoose";

/**
 * Schools, parks, hawker centres, CHAS clinics and eldercare services.
 * `type` is one of: school | park | hawker | healthcare | eldercare.
 * OWNER: Data pipeline & QA
 */
const amenitySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ["school", "park", "hawker", "healthcare", "eldercare"], index: true },
  name: { type: String, required: true },
  location: {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },   // [lng, lat]
  },
});

amenitySchema.index({ location: "2dsphere" });

export default mongoose.model("Amenity", amenitySchema);
