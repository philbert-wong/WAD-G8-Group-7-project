// The /api/amenities controller: every MRT station, hawker centre, park and primary school,
// with its position, so the map can draw them as dots.
// routes/amenities-routes.js decides which address runs which function below.
const amenityModel = require('../models/amenity-model');

// The parts of the model this file uses
const Amenity = amenityModel.Amenity;
const CATEGORIES = amenityModel.CATEGORIES; // ['mrt', 'hawker', 'park', 'school']

// Helpers (only used in this file)

// Used in the catch block: sends the right error answer to the frontend.
function sendError(res, error) {
  // Mongoose rejected the data
  if (error.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  // Anything else is a bug or a database problem: log it for us, keep the message simple for the user
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
}

// Controller functions (one per address, see routes/amenities-routes.js)

// GET /api/amenities              every amenity
// GET /api/amenities?category=mrt only one category (mrt, hawker, park or school)
// Answers { total, results: [{ name, category, lat, lng }] }
exports.listAmenities = async (req, res) => {
  // category is optional, but if it is sent it must be one we know
  const filter = {};
  if (req.query.category !== undefined) {
    if (!CATEGORIES.includes(req.query.category)) {
      return res.status(400).json({ message: 'category must be mrt, hawker, park or school' });
    }
    filter.category = req.query.category;
  }

  try {
    const amenities = await Amenity.find(filter);

    const results = [];
    for (const amenity of amenities) {
      // MongoDB stores the position as [lng, lat]; the map (Leaflet) wants lat and lng separately
      results.push({
        name: amenity.name,
        category: amenity.category,
        lat: amenity.location.coordinates[1],
        lng: amenity.location.coordinates[0],
      });
    }
    res.json({ total: results.length, results: results });
  } catch (error) {
    sendError(res, error);
  }
};
