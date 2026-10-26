// The /api/blocks routes: search, town names, nearby blocks, and one block's details
import { Router } from 'express';
import { Block } from '../models/Block.js';
import { buildFilter } from '../lib/buildFilter.js';
import { toCard } from '../lib/blockCard.js';
import { findNearestAmenities } from '../lib/findNearestAmenities.js';
import { salesSummary } from '../lib/salesSummary.js';
import { isBlank, isNumber } from '../lib/numberCheck.js';
import { sendError } from '../lib/sendError.js';
import { getOneMapToken } from '../lib/oneMapToken.js';
import { Amenity } from '../models/Amenity.js';


const router = Router();

// Used by .sort() to put the cheapest block first
function compareByPrice(a, b) {
  return a.price - b.price;
}

// GET /api/blocks?q=punggol&flatType=4 ROOM&maxPrice=700000&minLease=60
// Search + filter. Sends every matching block (we only have a few hundred), cheapest first.
async function searchBlocks(req, res) {
  // The number filters must be numbers (or left out)
  const numberFields = ['maxPrice', 'minLease'];
  for (const field of numberFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }

  try {
    const filter = buildFilter(req.query);
    const blocks = await Block.find(filter);
    blocks.sort(compareByPrice);

    const results = [];
    for (const block of blocks) {
      results.push(toCard(block));
    }
    res.json({ total: results.length, results: results });
  } catch (error) {
    sendError(res, error);
  }
}

// GET /api/blocks/area
// Every town name in the database, for the search suggestions
async function listTowns(req, res) {
  try {
    const towns = await Block.distinct('town');
    res.json(towns);
  } catch (error) {
    sendError(res, error);
  }
}

// GET /api/blocks/nearby?lat=1.40&lng=103.90&radius=1000&limit=20
// GEOSPATIAL: blocks within `radius` metres of a point, closest first.
async function nearbyBlocks(req, res) {
  // lat and lng must be numbers, and both must be sent
  const pointFields = ['lat', 'lng'];
  for (const field of pointFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }
  if (isBlank(req.query.lat) || isBlank(req.query.lng)) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  // radius and limit are optional, but must be numbers if sent
  const optionalFields = ['radius', 'limit'];
  for (const field of optionalFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  // How far to look: 1000 m unless the URL says otherwise, and never more than 5000 m
  let radius = 1000;
  if (!isBlank(req.query.radius)) {
    radius = Number(req.query.radius);
  }
  if (radius > 5000) {
    radius = 5000;
  }

  // How many blocks to send: 20 unless the URL says otherwise, and never more than 50
  let limit = 20;
  if (!isBlank(req.query.limit)) {
    limit = Number(req.query.limit);
  }
  if (limit > 50) {
    limit = 50;
  }

  try {
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

    const results = [];
    for (const block of blocks) {
      const card = toCard(block);
      card.distance = Math.round(block.distance);
      results.push(card);
    }
    res.json({ total: results.length, results: results });
  } catch (error) {
    sendError(res, error);
  }
}

// GET /api/blocks/:id/amenities
// Nearest MRT, hawker centre, park and school, with distance in metres.
async function blockAmenities(req, res) {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const amenities = await findNearestAmenities(block.location);
    res.json({ blockId: block._id, amenities: amenities });
  } catch (error) {
    sendError(res, error);
  }
}

// GET /api/blocks/:id/sales
// The recent sales behind the price range: month, storey, floor area, price and price per m2.
async function blockSales(req, res) {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const summary = salesSummary(block.sales);
    summary.blockId = block._id;
    res.json(summary);
  } catch (error) {
    sendError(res, error);
  }
}

// GET /api/blocks/:id
// One block, in the same shape as a search result card
async function oneBlock(req, res) {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    res.json(toCard(block));
  } catch (error) {
    sendError(res, error);
  }
}

// 1. GET /api/blocks/place?q=560406
// OneMap search: turns an address / postal code / place name into { name, lat, lng }.
// The frontend then calls /api/blocks/nearby?lat=..&lng=.. with it.
async function findPlace(req, res) {
  if (isBlank(req.query.q)){
    return res.status(400).json({ message: 'q is required'});
  }
  const url =
    'https://www.onemap.gov.sg/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&searchVal=' +
    encodeURIComponent(req.query.q);

  try {
    const response = await fetch(url, { headers: { Authorization: await getOneMapToken() } });
    if (!response.ok){
      return res.status(502).json({message: 'Place search is unavailable' });
    }
    const data = await response.json();
    if (data.results.length === 0){
      return res.status(404).json({message: 'Place not found' });
    }

    const firstResult = data.results[0];
    return res.json({
      name: firstResult.SEARCHVAL,
      lat: Number(firstResult.LATITUDE),
      lng: Number(firstResult.LONGITUDE)
    });
  } catch (error) {
    sendError(res, error);
  }
}

// 2. GET /api/blocks/:id/live-sales
// Latest sales for this block straight from data.gov.sg, in the same shape as /sales.
async function liveSales(req, res) {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const params = new URLSearchParams({
      resource_id: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc',
      filters: JSON.stringify({
        block: block.block,
        street_name: block.street,
        flat_type: block.flatType,
      }),
      sort: 'month desc',
      limit: '50',
    });

    let response;
    try {
      response = await fetch('https://data.gov.sg/api/action/datastore_search?' + params);
    } catch (fetchError) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    if (!response.ok) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    const data = await response.json();

    if (!data.result || !data.result.records || data.result.records.length === 0) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    const sales = data.result.records.map(record => ({
      month: record.month,
      storey: record.storey_range,
      areaSqm: Number(record.floor_area_sqm),
      price: Number(record.resale_price)
    }));

    const summary = salesSummary(sales);
    summary.blockId = block._id;
    summary.source = 'live';
    res.json(summary);  

  } catch (error) {
    sendError(res, error);
  }
}


// 3. GET /api/blocks/:id/walk-to-mrt
// Real walking time to the nearest MRT from OneMap's routing service.
async function walkToMrt(req, res) {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    // OneMap wants "lat,lng". MongoDB stores [lng, lat], so the order flips here.
    const start = block.location.coordinates[1] + ',' + block.location.coordinates[0];

    const found = await Amenity.aggregate([
      {
        $geoNear: {
          near: block.location,
          distanceField: 'distance',
          spherical: true,
          query: { category: 'mrt' },
        },
      },
      { $limit: 1 },
    ]);

    if (found.length === 0) {
      return res.status(404).json({ message: 'Nearest MRT station not found' });
    }
    const nearestMrt = found[0];
    const end = nearestMrt.location.coordinates[1] + ',' + nearestMrt.location.coordinates[0];

    const url =
      'https://www.onemap.gov.sg/api/public/routingsvc/route?start=' + start +
      '&end=' + end + '&routeType=walk';
    const response = await fetch(url, { headers: { Authorization: await getOneMapToken() } });
    if (!response.ok) {
      return res.json({ minutes: block.mrtWalkMinutes, source: 'estimate' });
    }
    const data = await response.json();

    if (!data || !data.route_summary) {
      return res.json({ minutes: block.mrtWalkMinutes, source: 'estimate' });
    }

    const minutes = Math.round(data.route_summary.total_time / 60);
    const metres = data.route_summary.total_distance;
    return res.json({ minutes, metres, source: 'onemap' });
  } catch (error) {
    sendError(res, error);
  }
}

router.get('/', searchBlocks);
router.get('/area', listTowns);
router.get('/nearby', nearbyBlocks);
router.get('/place', findPlace);
router.get('/:id/amenities', blockAmenities);
router.get('/:id/sales', blockSales);
router.get('/:id/live-sales', liveSales);
router.get('/:id/walk-to-mrt', walkToMrt);
router.get('/:id', oneBlock);

export default router;
