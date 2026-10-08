import { Router } from 'express';
import { Block } from '../models/Block.js';
import { streetKey } from '../lib/streets.js';
import { minLeaseCommenceYear, remainingLeaseNow } from '../lib/resale.js';
import { ensureGeocoded } from '../services/onemap.js';
import { HttpError, optionalNumber } from '../lib/http.js';

const router = Router();

const MAX_PAGE_SIZE = 48;
const GEOCODE_WAIT_MS = 2500;

function toCard(doc) {
  const [lng, lat] = doc.location?.coordinates ?? [];
  return {
    blockId: doc._id,
    block: doc.block,
    street: doc.street,
    town: doc.town,
    postal: doc.postal ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    leaseCommenceYear: doc.leaseCommenceYear,
    remainingLease: remainingLeaseNow(doc.leaseCommenceYear),
    ...doc.flatTypes,
    isSearchedBlock: Boolean(doc.isSearchedBlock),
  };
}

/**
 * GET /api/blocks
 *   street     road name from OneMap (any spelling, abbreviations are normalised)
 *   block      block number to pin to the top of the results, e.g. "406"
 *   town       exact HDB town, e.g. "ANG MO KIO"
 *   flatType   comma-separated, e.g. "3 ROOM,4 ROOM"
 *   maxPrice   budget: median recent price must be at or below this
 *   minLease   minimum remaining lease in years
 *   page, pageSize
 * One result per (block, flat type), cheapest first.
 */
router.get('/', async (req, res) => {
  const { street, block, town, flatType } = req.query;
  const maxPrice = optionalNumber(req.query.maxPrice, 'maxPrice');
  const minLease = optionalNumber(req.query.minLease, 'minLease');
  const page = Math.max(1, optionalNumber(req.query.page, 'page') ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, optionalNumber(req.query.pageSize, 'pageSize') ?? 12));

  const blockMatch = {};
  if (street) blockMatch.streetKey = streetKey(street);
  if (town) blockMatch.town = town;
  if (minLease != null) blockMatch.leaseCommenceYear = { $gte: minLeaseCommenceYear(minLease) };

  const typeMatch = {};
  const flatTypes = flatType ? String(flatType).split(',').filter(Boolean) : [];
  if (flatTypes.length) typeMatch['flatTypes.flatType'] = { $in: flatTypes };
  if (maxPrice != null) typeMatch['flatTypes.medianPrice'] = { $lte: maxPrice };

  const sortStage = { ...(block ? { isSearchedBlock: -1 } : {}), 'flatTypes.medianPrice': 1, _id: 1, 'flatTypes.flatType': 1 };

  const [{ total, results }] = await Block.aggregate([
    { $match: blockMatch },
    { $unwind: '$flatTypes' },
    { $match: typeMatch },
    { $addFields: { isSearchedBlock: { $eq: ['$block', block ? String(block).toUpperCase() : null] } } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        results: [{ $sort: sortStage }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }],
      },
    },
  ]);

  // Card images need coordinates; look up any blocks on this page that have not been geocoded yet.
  const uniqueBlocks = [...new Map(results.map((r) => [r._id, r])).values()];
  await ensureGeocoded(uniqueBlocks, { waitMs: GEOCODE_WAIT_MS });
  for (const r of results) {
    const { location, postal } = uniqueBlocks.find((b) => b._id === r._id);
    Object.assign(r, { location, postal });
  }

  res.json({ total: total[0]?.n ?? 0, page, pageSize, results: results.map(toCard) });
});

// GET /api/blocks/:id - one block with its price summary per flat type
router.get('/:id', async (req, res) => {
  const block = await Block.findById(req.params.id).lean();
  if (!block) throw new HttpError(404, 'Block not found');
  await ensureGeocoded([block], { waitMs: GEOCODE_WAIT_MS });
  const [lng, lat] = block.location?.coordinates ?? [];
  res.json({
    blockId: block._id,
    block: block.block,
    street: block.street,
    town: block.town,
    postal: block.postal ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    leaseCommenceYear: block.leaseCommenceYear,
    remainingLease: remainingLeaseNow(block.leaseCommenceYear),
    flatTypes: block.flatTypes,
  });
});

export default router;
