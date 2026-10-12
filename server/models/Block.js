import mongoose from 'mongoose';

// One document = one HDB block + one flat type (e.g. "Blk 406 Ang Mo Kio Ave 10, 4 ROOM")
const blockSchema = new mongoose.Schema({
  block: { type: String, required: true },
  street: { type: String, required: true },
  town: { type: String, required: true },
  flatType: { type: String, required: true }, // "3 ROOM", "4 ROOM", ...
  price: { type: Number, required: true }, // typical (median) resale price in dollars
  priceLow: Number, // cheapest recent sale
  priceHigh: Number, // most expensive recent sale
  leaseCommenceYear: { type: Number, required: true },
  mrtName: String, // nearest MRT station
  mrtWalkMinutes: Number, // walking minutes to it

  // Straight-line metres to the nearest amenity of each kind. Worked out once by the seed script
  // and used by the "What matters to you?" match score on the search page.
  distances: {
    school: Number,
    mrt: Number,
    hawker: Number,
    park: Number,
  },

  // The recent sales those prices come from, newest first
  sales: [{
    _id: false, // the sales do not need their own id
    month: String, // "2026-08"
    storey: String, // "04 TO 06"
    areaSqm: Number, // floor area in square metres
    price: Number,
  }],

  // GeoJSON point. NOTE: MongoDB wants [longitude, latitude] (lng first!)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
});

// This index is what makes distance queries ($geoNear) possible
blockSchema.index({ location: '2dsphere' });

export const Block = mongoose.model('Block', blockSchema);
