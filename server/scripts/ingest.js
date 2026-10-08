// Downloads every HDB resale transaction since 2017 from data.gov.sg and loads MongoDB:
//   transactions  one document per sale
//   blocks        one document per block with median prices per flat type
// The CSV is cached in server/data/ so re-runs are fast; pass --refresh to download it again.
//
//   npm run ingest            (or npm run seed to ingest and then fit the regression models)
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { parse } from 'csv-parse/sync';
import { connectDb, disconnectDb } from '../src/db.js';
import { Block } from '../src/models/Block.js';
import { Transaction } from '../src/models/Transaction.js';
import { buildBlocks, parseResaleRow } from '../src/lib/resale.js';

const DATASET_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc'; // Resale flat prices, Jan 2017 onwards
const DATASET_API = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}`;
const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
const csvPath = `${dataDir}resale-prices.csv`;
const BATCH = 5000;

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// data.gov.sg prepares the CSV on request: initiate the download, then poll until a URL is ready.
async function datasetDownloadUrl() {
  const started = await getJson(`${DATASET_API}/initiate-download`);
  if (started.data?.url) return started.data.url;
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(3000);
    const polled = await getJson(`${DATASET_API}/poll-download`);
    if (polled.data?.url) return polled.data.url;
  }
  throw new Error('data.gov.sg did not return a download URL; try again later');
}

async function loadCsv(refresh) {
  if (refresh || !existsSync(csvPath)) {
    console.log('Downloading resale prices from data.gov.sg...');
    const res = await fetch(await datasetDownloadUrl());
    if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);
    mkdirSync(dataDir, { recursive: true });
    await writeFile(csvPath, await res.text());
  } else {
    console.log(`Using cached ${csvPath} (pass --refresh to re-download)`);
  }
  return parse(await readFile(csvPath, 'utf8'), { columns: true, skip_empty_lines: true });
}

async function main() {
  const rows = await loadCsv(process.argv.includes('--refresh'));
  const transactions = rows.map(parseResaleRow);
  console.log(`Parsed ${transactions.length} transactions`);

  await connectDb();
  await Promise.all([Transaction.init(), Block.init()]);

  await Transaction.deleteMany({});
  for (let i = 0; i < transactions.length; i += BATCH) {
    await Transaction.insertMany(transactions.slice(i, i + BATCH), { ordered: false, lean: true });
    process.stdout.write(`\rInserted ${Math.min(i + BATCH, transactions.length)} transactions`);
  }
  console.log();

  // Upsert so coordinates from earlier OneMap lookups are kept.
  const blocks = buildBlocks(transactions);
  for (let i = 0; i < blocks.length; i += BATCH) {
    await Block.bulkWrite(
      blocks.slice(i, i + BATCH).map(({ _id, ...fields }) => ({
        updateOne: { filter: { _id }, update: { $set: fields }, upsert: true },
      })),
      { ordered: false },
    );
  }
  await Block.deleteMany({ _id: { $nin: blocks.map((b) => b._id) } });
  console.log(`Upserted ${blocks.length} blocks`);

  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
