import Transaction from "../models/Transaction.js";
import RegressionModel from "../models/RegressionModel.js";
import { fitTrend, fitLeaseModel, MIN_TREND_N } from "../lib/trends.js";

/**
 * Fits every regression and stores the results. Slow on the real dataset, so it
 * runs from `npm run fit-models` and the seed, and lazily once if the collection
 * is empty. OWNER: Data pipeline & QA
 */
export async function fitAllModels() {
  const txns = await Transaction.find({},
    "town flatType month leaseCommenceYear storeyRange floorAreaSqm resalePrice pricePsm").lean();

  const byType = new Map();
  for (const t of txns) {
    if (!byType.has(t.flatType)) byType.set(t.flatType, []);
    byType.get(t.flatType).push(t);
  }

  const docs = [];
  const keep = (scope, town, flatType, fit) => {
    if (!fit) return;
    const { n, r2, ...rest } = fit;
    docs.push({ scope, town, flatType, n, r2, fit: rest });
  };

  for (const [flatType, rows] of byType) {
    keep("trend", null, flatType, fitTrend(rows, { controlTowns: true }));

    const byTown = new Map();
    for (const t of rows) {
      if (!byTown.has(t.town)) byTown.set(t.town, []);
      byTown.get(t.town).push(t);
    }
    for (const [town, list] of byTown) {
      if (list.length >= MIN_TREND_N) keep("trend", town, flatType, fitTrend(list));
    }
  }
  keep("lease", null, "ALL", fitLeaseModel(txns));

  await RegressionModel.deleteMany({});
  if (docs.length) await RegressionModel.insertMany(docs);
  return { transactions: txns.length, models: docs.length };
}

let fitting = null;

/** Fit once if nothing is stored yet; concurrent callers share the same run. */
export async function ensureModels() {
  if (await RegressionModel.estimatedDocumentCount() > 0) return;
  fitting ??= fitAllModels().finally(() => { fitting = null; });
  await fitting;
}
