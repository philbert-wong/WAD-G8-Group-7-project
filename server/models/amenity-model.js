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

// ---------- Nearest amenities (used by the blocks controller) ----------

// GEOSPATIAL: for one location, find the closest amenity of each category (mrt, hawker, park, school).
//
// $geoNear sorts amenities by distance from `near` and puts the distance (in metres)
// in a new field called "distance". It must be the first stage of the aggregate.
export async function findNearestAmenities(location) {
  const results = [];

  for (const category of CATEGORIES) {
    // Ask MongoDB for the single closest amenity of this category
    const found = await Amenity.aggregate([
      {
        $geoNear: {
          near: location,
          distanceField: 'distance',
          spherical: true,
          query: { category: category },
        },
      },
      { $limit: 1 },
    ]);

    if (found.length > 0) {
      const nearest = found[0];
      results.push({
        category: category,
        name: nearest.name,
        distance: Math.round(nearest.distance),
      });
    }
  }

  return results;
}

// ---------- Straight-line distance (used by seed.js) ----------

// Straight-line distance in metres between two points on the earth (the "haversine" formula).
// Only the seed script uses this (prep/ has its own copy); the API uses MongoDB's $geoNear instead.

const EARTH_RADIUS = 6371000; // metres

// Angles in the formula must be in radians, not degrees
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// pointA and pointB are [latitude, longitude], e.g. [1.37, 103.85]
export function straightLineDistance(pointA, pointB) {
  const lat1 = pointA[0];
  const lng1 = pointA[1];
  const lat2 = pointB[0];
  const lng2 = pointB[1];

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinHalfLng * sinHalfLng;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}
