// The /api/shortlist controller: list, save, change the note of, and remove saved flats.
// routes/shortlist-routes.js decides which address runs which function below (all need a login).
import { Shortlist } from '../models/shortlist-model.js';
import { Block, toCard } from '../models/block-model.js';

// =====================================================================
// Helpers (only used in this file)
// =====================================================================

// Used in the catch block of every route: sends the right error answer to the frontend.
function sendError(res, error) {
  // MongoDB could not understand an id, e.g. /api/shortlist/abc
  if (error.name === 'CastError') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  // Mongoose rejected the data, e.g. a note longer than 500 letters
  if (error.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  // Anything else is a bug or a database problem: log it for us, keep the message simple for the user
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
}

// Shape of one shortlist item sent to the frontend
function toItem(item, block) {
  return {
    id: item._id,
    note: item.note,
    createdAt: item.createdAt,
    block: toCard(block),
  };
}

// Used by .sort() to put the most recently saved item first
function compareNewestFirst(a, b) {
  return b.createdAt - a.createdAt;
}

// =====================================================================
// Controller functions (one per address, see routes/shortlist-routes.js)
// =====================================================================

// READ   GET /api/shortlist
// Every saved flat, newest first
export async function listShortlist(req, res) {
  try {
    const items = await Shortlist.find({ user: req.user.id});
    items.sort(compareNewestFirst);

    const results = [];
    for (const item of items) {
      // A saved item only stores the block's id, so look up the full block
      const block = await Block.findById(item.block);
      // Skip items whose block no longer exists (for example after re-seeding)
      if (block !== null) {
        results.push(toItem(item, block));
      }
    }
    res.json(results);
  } catch (error) {
    sendError(res, error);
  }
}

// CREATE POST /api/shortlist   body: { "blockId": "...", "note": "near my parents" }
// Saves a flat. The note is optional.
export async function addToShortlist(req, res) {
  if (req.body === undefined || !req.body.blockId) {
    return res.status(400).json({ message: 'blockId is required' });
  }

  let note = '';
  if (req.body.note !== undefined && req.body.note !== null) {
    note = req.body.note;
  }

  try {
    const block = await Block.findById(req.body.blockId);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const alreadySaved = await Shortlist.findOne({ block: block._id, user: req.user.id});
    if (alreadySaved !== null) {
      return res.status(409).json({ message: 'Already in your shortlist' });
    }
    const item = await Shortlist.create({ block: block._id, note: note, user: req.user.id });
    res.status(201).json(toItem(item, block));
  } catch (error) {
    sendError(res, error);
  }
}

// UPDATE PATCH /api/shortlist/:id   body: { "note": "visited on Sunday" }
// Changes the note of one saved flat
export async function updateNote(req, res) {
  if (req.body === undefined || typeof req.body.note !== 'string') {
    return res.status(400).json({ message: 'note must be text' });
  }

  try {
    const item = await Shortlist.findOne({_id:req.params.id, user:req.user.id});
    if (item === null) {
      return res.status(404).json({ message: 'Shortlist item not found' });
    }

    item.note = req.body.note;
    await item.save();

    const block = await Block.findById(item.block);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }
    res.json(toItem(item, block));
  } catch (error) {
    sendError(res, error);
  }
}

// DELETE DELETE /api/shortlist/:id
// Removes one saved flat. 204 means "done, nothing to send back".
export async function removeFromShortlist(req, res) {
  try {
    const item = await Shortlist.findOneAndDelete({_id: req.params.id, user: req.user.id});
    if (item === null) {
      return res.status(404).json({ message: 'Shortlist item not found' });
    }
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
}
