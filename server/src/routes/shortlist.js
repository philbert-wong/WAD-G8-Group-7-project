import { Router } from 'express';
import mongoose from 'mongoose';
import { Block } from '../models/Block.js';
import { Shortlist } from '../models/Shortlist.js';
import { HttpError, requiredString } from '../lib/http.js';
import { remainingLeaseNow } from '../lib/resale.js';

const router = Router();

// Until login (feature 11) exists, each browser identifies itself with a random id it keeps in
// localStorage. Swap this middleware for the JWT one and set req.ownerId to the user id.
router.use((req, _res, next) => {
  const id = req.get('X-Client-Id');
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new HttpError(400, 'Missing or invalid X-Client-Id header');
  req.ownerId = id;
  next();
});

function noteFrom(body) {
  const note = body?.note ?? '';
  if (typeof note !== 'string') throw new HttpError(400, 'note must be a string');
  if (note.length > 500) throw new HttpError(400, 'note must be 500 characters or fewer');
  return note;
}

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Shortlist item not found');
}

async function withBlockDetails(items) {
  const blocks = await Block.find({ _id: { $in: items.map((i) => i.blockId) } }).lean();
  const byId = new Map(blocks.map((b) => [b._id, b]));
  return items.map((item) => {
    const block = byId.get(item.blockId);
    const stats = block?.flatTypes.find((f) => f.flatType === item.flatType);
    const [lng, lat] = block?.location?.coordinates ?? [];
    return {
      id: item._id,
      blockId: item.blockId,
      flatType: item.flatType,
      note: item.note,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      block: block
        ? {
            block: block.block,
            street: block.street,
            town: block.town,
            lat: lat ?? null,
            lng: lng ?? null,
            remainingLease: remainingLeaseNow(block.leaseCommenceYear),
            medianPrice: stats?.medianPrice ?? null,
            medianPricePsm: stats?.medianPricePsm ?? null,
          }
        : null,
    };
  });
}

router.get('/', async (req, res) => {
  const items = await Shortlist.find({ ownerId: req.ownerId }).sort({ createdAt: -1 }).lean();
  res.json(await withBlockDetails(items));
});

router.post('/', async (req, res) => {
  const blockId = requiredString(req.body?.blockId, 'blockId');
  const flatType = requiredString(req.body?.flatType, 'flatType');
  const note = noteFrom(req.body);
  if (!(await Block.exists({ _id: blockId, 'flatTypes.flatType': flatType }))) {
    throw new HttpError(404, 'No resale records for that block and flat type');
  }
  try {
    const item = await Shortlist.create({ ownerId: req.ownerId, blockId, flatType, note });
    const [withDetails] = await withBlockDetails([item.toObject()]);
    res.status(201).json(withDetails);
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'Already in your shortlist');
    throw err;
  }
});

router.patch('/:id', async (req, res) => {
  checkId(req.params.id);
  const item = await Shortlist.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { note: noteFrom(req.body) },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!item) throw new HttpError(404, 'Shortlist item not found');
  const [withDetails] = await withBlockDetails([item]);
  res.json(withDetails);
});

router.delete('/:id', async (req, res) => {
  checkId(req.params.id);
  const { deletedCount } = await Shortlist.deleteOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!deletedCount) throw new HttpError(404, 'Shortlist item not found');
  res.status(204).end();
});

export default router;
