import { Router } from 'express';
import { Block } from '../models/Block.js';
import { buildFilter } from '../lib/buildFilter.js';
import { toCard } from '../lib/blockCard.js';
import { findBlock } from '../lib/findBlock.js';
import { findNearestAmenities } from '../lib/findNearestAmenities.js';
import { salesSummary } from '../lib/salesSummary.js';
import { toNumber } from '../lib/toNumber.js';
import { HttpError } from '../lib/HttpError.js';

const router = Router();

// GET /api/blocks?q=punggol&flatType=4 ROOM&maxPrice=700000&minLease=60&maxWalk=10
// Search + filter. Cheapest first.
router.get('/', async (req, res) => {
  const filter = buildFilter(req.query);
  // Send every match (we only have a few hundred blocks), so "Best match first" can sort all of them
  const limit = Math.min(500, toNumber(req.query.limit, 'limit') ?? 500);

  const blocks = await Block.find(filter).sort({ price: 1 }).limit(limit).lean();
  const total = await Block.countDocuments(filter);

  res.json({ total, results: blocks.map(toCard) });
});

// GET area names from database
router.get('/area', async (req, res) => {
  const area = await Block.distinct('town')
  res.json(area)
})


// GET /api/blocks/nearby?lat=1.40&lng=103.90&radius=1000&limit=20
// GEOSPATIAL: blocks within `radius` metres of a point, closest first.
router.get('/nearby', async (req, res) => {
  const lat = toNumber(req.query.lat, 'lat');
  const lng = toNumber(req.query.lng, 'lng');
  if (lat === null || lng === null) {
    throw new HttpError(400, 'lat and lng are required');
  }
  const radius = Math.min(5000, toNumber(req.query.radius, 'radius') ?? 1000);
  const limit = Math.min(50, toNumber(req.query.limit, 'limit') ?? 20);

  // $geoNear sorts by distance and adds a "distance" field in metres. Remember: [lng, lat].
  const blocks = await Block.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance',
        maxDistance: radius,
        spherical: true,
      },
    },
    { $limit: limit },
  ]);

  const results = blocks.map((block) => ({ ...toCard(block), distance: Math.round(block.distance) }));
  res.json({ total: results.length, results });
});

// GET /api/blocks/:id/amenities
// Nearest MRT, hawker centre, park and school, with distance in metres.
router.get('/:id/amenities', async (req, res) => {
  const block = await findBlock(req.params.id);
  const amenities = await findNearestAmenities(block.location);
  res.json({ blockId: block._id, amenities });
});

// GET /api/blocks/:id/sales
// The recent sales behind the price range: month, storey, floor area, price and price per m2.
router.get('/:id/sales', async (req, res) => {
  const block = await findBlock(req.params.id);
  const summary = salesSummary(block.sales);
  summary.blockId = block._id;
  res.json(summary);
});

// GET /api/blocks/:id
router.get('/:id', async (req, res) => {
  const block = await findBlock(req.params.id);
  res.json(toCard(block));
});

export default router;
