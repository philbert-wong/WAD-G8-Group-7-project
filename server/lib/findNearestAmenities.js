import { Amenity, CATEGORIES } from '../models/Amenity.js';

// GEOSPATIAL: for one location, find the closest amenity of each category (mrt, hawker, park, school).
//
// $geoNear sorts amenities by distance from `near` and puts the distance (in metres)
// in a new field called "distance". It must be the first stage of the aggregate.
export async function findNearestAmenities(location) {
  const results = [];

  for (const category of CATEGORIES) {
    const [nearest] = await Amenity.aggregate([
      {
        $geoNear: {
          near: location,
          distanceField: 'distance',
          spherical: true,
          query: { category },
        },
      },
      { $limit: 1 },
    ]);

    if (nearest) {
      results.push({ category, name: nearest.name, distance: Math.round(nearest.distance) });
    }
  }

  return results;
}
