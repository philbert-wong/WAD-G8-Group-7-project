import mongoose from 'mongoose';

export const CATEGORIES = ['mrt', 'hawker', 'park', 'school'];

// One document = one place near blocks, e.g. an MRT station or a hawker centre
const amenitySchema = new mongoose.Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
});

amenitySchema.index({ location: '2dsphere' });

export const Amenity = mongoose.model('Amenity', amenitySchema);
