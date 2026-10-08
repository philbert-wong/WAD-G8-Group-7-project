// Sends all transactions to the Python ml-service, which fits the multiple linear regression
// models with scikit-learn, and stores the returned coefficients in MongoDB.
// Start ml-service first (see README), then: npm run fit
import { config } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { RegressionModel } from '../src/models/RegressionModel.js';
import { Transaction } from '../src/models/Transaction.js';

const FIELDS = ['town', 'flatType', 't', 'remainingLease', 'floorArea', 'storeyMid', 'price'];

async function postToMl(path, columns) {
  let res;
  try {
    res = await fetch(`${config.mlServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns }),
    });
  } catch (err) {
    throw new Error(`Cannot reach ml-service at ${config.mlServiceUrl} - is it running? (${err.cause?.code ?? err.message})`);
  }
  const body = await res.json();
  if (!res.ok) throw new Error(`ml-service ${path}: ${body.error ?? res.status}`);
  return body;
}

async function main() {
  await connectDb();

  const columns = Object.fromEntries(FIELDS.map((f) => [f, []]));
  const projection = Object.fromEntries(FIELDS.map((f) => [f, 1]));
  for await (const tx of Transaction.find({}, projection).lean().cursor()) {
    for (const f of FIELDS) columns[f].push(tx[f]);
  }
  const n = columns.price.length;
  if (!n) throw new Error('No transactions in the database - run npm run ingest first');
  console.log(`Fitting models on ${n} transactions...`);

  const { models } = await postToMl('/fit/price-trend', columns);
  await RegressionModel.deleteMany({ kind: 'price-trend' });
  await RegressionModel.insertMany(
    models.map((m) => ({ kind: 'price-trend', town: m.town, flatType: m.flatType, n: m.n, r2: m.r2, result: m })),
  );
  console.log(`Stored ${models.length} price-trend models (one per town and flat type)`);

  const { model } = await postToMl('/fit/lease-decay', columns);
  await RegressionModel.findOneAndUpdate(
    { kind: 'lease-decay', town: null, flatType: null },
    { n: model.n, r2: model.r2, result: model, fittedAt: new Date() },
    { upsert: true },
  );
  console.log(`Stored lease-decay model: ${model.leaseCoefPsm.toFixed(1)} $/sqm per lease year, R² ${model.r2.toFixed(3)}`);

  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err.message);
  await disconnectDb();
  process.exit(1);
});
