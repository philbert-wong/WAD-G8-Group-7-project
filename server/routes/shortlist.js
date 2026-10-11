import { Router } from 'express';
import { Shortlist } from '../models/Shortlist.js';
import { findBlock } from '../lib/findBlock.js';
import { toCard } from '../lib/blockCard.js';
import { HttpError } from '../lib/HttpError.js';

const router = Router();

// Shape of one shortlist item sent to the frontend
function toItem(item, block) {
  return { id: item._id, note: item.note, createdAt: item.createdAt, block: toCard(block) };
}

// READ   GET /api/shortlist
router.get('/', async (req, res) => {
  const items = await Shortlist.find().sort({ createdAt: -1 }).populate('block').lean();
  // populate('block') swaps the saved block id for the full block document
  res.json(items.filter((item) => item.block).map((item) => toItem(item, item.block)));
});

// CREATE POST /api/shortlist   body: { "blockId": "...", "note": "near my parents" }
router.post('/', async (req, res) => {
  const { blockId, note } = req.body;
  if (!blockId) {
    throw new HttpError(400, 'blockId is required');
  }

  const block = await findBlock(blockId); // 404 if it does not exist

  const alreadySaved = await Shortlist.findOne({ block: block._id });
  if (alreadySaved) {
    throw new HttpError(409, 'Already in your shortlist');
  }

  const item = await Shortlist.create({ block: block._id, note: note ?? '' });
  res.status(201).json(toItem(item, block));
});

// UPDATE PATCH /api/shortlist/:id   body: { "note": "visited on Sunday" }
router.patch('/:id', async (req, res) => {
  const item = await Shortlist.findById(req.params.id);
  if (!item) {
    throw new HttpError(404, 'Shortlist item not found');
  }

  if (typeof req.body.note !== 'string') {
    throw new HttpError(400, 'note must be text');
  }
  item.note = req.body.note;
  await item.save();

  const block = await findBlock(item.block);
  res.json(toItem(item, block));
});

// DELETE DELETE /api/shortlist/:id
router.delete('/:id', async (req, res) => {
  const item = await Shortlist.findByIdAndDelete(req.params.id);
  if (!item) {
    throw new HttpError(404, 'Shortlist item not found');
  }
  res.status(204).end();
});

export default router;
