const mongoose = require('mongoose');

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

const Block = mongoose.model('Block', blockSchema);
exports.Block = Block;

// ---------- Lease helpers (used by toCard below and by the search filter) ----------

// HDB leases are 99 years long.
const LEASE_YEARS = 99;

// A block that started its lease in 1990 has 99 - (2026 - 1990) = 63 years left in 2026.
exports.remainingLease = function (leaseCommenceYear) {
  const thisYear = new Date().getFullYear();
  return LEASE_YEARS - (thisYear - leaseCommenceYear);
};

// Used by the filter: "at least 60 years left" means "lease must have started in this year or later".
exports.earliestCommenceYear = function (minLease) {
  const thisYear = new Date().getFullYear();
  return thisYear - LEASE_YEARS + minLease;
};

// ---------- Card (used by the blocks and shortlist controllers) ----------

// Turns a block from MongoDB into the simple object the frontend shows on a card.
exports.toCard = function (block) {
  // MongoDB stores the position as [longitude, latitude]
  const lng = block.location.coordinates[0];
  const lat = block.location.coordinates[1];

  // How many recent sales the price range is based on
  let salesCount = 0;
  if (block.sales) {
    salesCount = block.sales.length;
  }

  return {
    id: block._id,
    block: block.block,
    street: block.street,
    town: block.town,
    flatType: block.flatType,
    price: block.price, // median
    priceLow: block.priceLow,
    priceHigh: block.priceHigh,
    salesCount: salesCount,
    remainingLease: exports.remainingLease(block.leaseCommenceYear),
    mrtName: block.mrtName,
    mrtWalkMinutes: block.mrtWalkMinutes,
    distances: block.distances, // nearest school, mrt, hawker, park in metres (for the match score)
    lat: lat,
    lng: lng,
  };
};
