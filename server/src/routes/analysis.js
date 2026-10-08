import { Router } from 'express';
import { RegressionModel } from '../models/RegressionModel.js';
import { Transaction } from '../models/Transaction.js';
import { HttpError, requiredString } from '../lib/http.js';

const router = Router();

const BASE_YEAR = 2017;

/**
 * GET /api/analysis/price-trend?town=ANG MO KIO&flatType=4 ROOM
 * Quarterly median prices plus the regression's fitted trend line, holding remaining lease,
 * floor area and storey at their averages for that town and flat type.
 */
router.get('/price-trend', async (req, res) => {
  const town = requiredString(req.query.town, 'town');
  const flatType = requiredString(req.query.flatType, 'flatType');

  const [stored, quarters] = await Promise.all([
    RegressionModel.findOne({ kind: 'price-trend', town, flatType }).lean(),
    Transaction.aggregate([
      { $match: { town, flatType } },
      {
        $group: {
          _id: {
            year: { $toInt: { $substr: ['$month', 0, 4] } },
            q: { $ceil: { $divide: [{ $toInt: { $substr: ['$month', 5, 2] } }, 3] } },
          },
          median: { $median: { input: '$price', method: 'approximate' } },
          n: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.q': 1 } },
    ]),
  ]);

  const quarterly = quarters.map(({ _id, median, n }) => ({
    quarter: `${_id.year} Q${_id.q}`,
    t: _id.year - BASE_YEAR + (_id.q - 1) / 4 + 0.125,
    median,
    n,
  }));

  let model = null;
  let fitted = [];
  if (stored) {
    model = stored.result;
    const { intercept, coefficients, featureMeans } = model;
    const baseline = intercept + Object.entries(coefficients)
      .filter(([feature]) => feature !== 't')
      .reduce((sum, [feature, coef]) => sum + coef * featureMeans[feature], 0);
    fitted = quarterly.map(({ quarter, t }) => ({ quarter, t, price: baseline + coefficients.t * t }));
  }

  res.json({ town, flatType, model, fittedAt: stored?.fittedAt ?? null, quarterly, fitted });
});

// GET /api/analysis/lease-decay - island-wide effect of remaining lease on price per sqm
router.get('/lease-decay', async (_req, res) => {
  const stored = await RegressionModel.findOne({ kind: 'lease-decay' }).lean();
  if (!stored) throw new HttpError(404, 'Lease decay model has not been fitted yet (run npm run fit)');
  res.json({ ...stored.result, fittedAt: stored.fittedAt });
});

export default router;
