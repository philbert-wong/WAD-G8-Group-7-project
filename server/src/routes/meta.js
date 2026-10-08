import { Router } from 'express';
import { Block } from '../models/Block.js';
import { Transaction } from '../models/Transaction.js';

const router = Router();

// GET /api/meta - options for the filter panel and the date range of the data
router.get('/', async (_req, res) => {
  const [towns, flatTypes, first, last, transactionCount] = await Promise.all([
    Block.distinct('town'),
    Block.distinct('flatTypes.flatType'),
    Transaction.findOne({}, { month: 1 }).sort({ month: 1 }).lean(),
    Transaction.findOne({}, { month: 1 }).sort({ month: -1 }).lean(),
    Transaction.estimatedDocumentCount(),
  ]);
  res.json({
    towns: towns.sort(),
    flatTypes: flatTypes.sort(),
    dataFrom: first?.month ?? null,
    dataTo: last?.month ?? null,
    transactionCount,
  });
});

export default router;
