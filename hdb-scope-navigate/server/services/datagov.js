/**
 * data.gov.sg — the ONLY file that knows what the resale dataset looks like.
 * OWNER: Data pipeline & QA
 *
 * Two access patterns, used for different jobs:
 *
 *   bulkDownload()  — one transfer of the whole dataset. Used once, by scripts/seed.js.
 *   query()         — paged JSON, 100 rows at a time. Used by scripts/refresh.js
 *                     for the weekly top-up, and for live lookups.
 *
 * Why not just page through everything? 240,000 rows at 100 per request is about
 * 2,400 requests, and unauthenticated callers are limited to roughly 5 per minute.
 * That's eight hours. The bulk download takes seconds.
 */

export const RESALE_DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";

const QUERY_BASE = "https://data.gov.sg/api/action/datastore_search";
const BULK_BASE = "https://api-open.data.gov.sg/v1/public/api/datasets";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Paged query. Returns { records, total }.
 * `filters` is an object like { town: "ANG MO KIO", flat_type: "4 ROOM" }.
 */
export async function query({ limit = 100, offset = 0, filters, sort } = {}) {
  const params = new URLSearchParams({
    resource_id: RESALE_DATASET_ID,
    limit: String(limit),
    offset: String(offset),
  });
  if (filters) params.set("filters", JSON.stringify(filters));
  if (sort) params.set("sort", sort);

  const res = await fetch(`${QUERY_BASE}?${params}`);
  if (!res.ok) throw new Error(`data.gov.sg HTTP ${res.status}`);

  const json = await res.json();
  if (!json.success) throw new Error("data.gov.sg returned success: false");

  return {
    records: json.result.records,
    total: json.result.total,
  };
}

/**
 * Two-step bulk download. Returns a URL to a CSV extract.
 * Step 1 starts the job, step 2 polls until it's ready.
 */
export async function bulkDownload({ datasetId = RESALE_DATASET_ID, maxWaitMs = 120000 } = {}) {
  const initRes = await fetch(`${BULK_BASE}/${datasetId}/initiate-download`);
  if (!initRes.ok) throw new Error(`initiate-download HTTP ${initRes.status}`);

  const deadline = Date.now() + maxWaitMs;
  let waitMs = 2000;

  while (Date.now() < deadline) {
    await sleep(waitMs);

    const pollRes = await fetch(`${BULK_BASE}/${datasetId}/poll-download`);
    if (!pollRes.ok) throw new Error(`poll-download HTTP ${pollRes.status}`);

    const json = await pollRes.json();
    const url = json?.data?.url;
    if (url) return url;

    waitMs = Math.min(waitMs * 1.5, 10000); // back off politely
  }

  throw new Error("Bulk download did not become ready in time");
}

/**
 * Turn one raw dataset row into our own shape.
 * The dataset gives everything as strings, including the price.
 *
 * "remaining_lease" arrives as "52 years 04 months" — parse it, don't Number() it.
 */
export function parseTransaction(row) {
  const floorAreaSqm = Number(row.floor_area_sqm);
  const resalePrice = Number(row.resale_price);

  return {
    month: row.month,                       // "2026-08"
    town: row.town,
    flatType: row.flat_type,
    block: row.block,
    streetName: row.street_name,
    storeyRange: row.storey_range,
    floorAreaSqm,
    flatModel: row.flat_model,
    leaseCommenceYear: Number(row.lease_commence_date),
    remainingLeaseYears: parseRemainingLease(row.remaining_lease),
    resalePrice,
    pricePsm: floorAreaSqm ? Math.round(resalePrice / floorAreaSqm) : null,
  };
}

/** "52 years 04 months" -> 52.33 */
export function parseRemainingLease(text) {
  if (!text) return null;
  const years = Number(/(\d+)\s*year/.exec(text)?.[1] ?? 0);
  const months = Number(/(\d+)\s*month/.exec(text)?.[1] ?? 0);
  if (!years && !months) return null;
  return Math.round((years + months / 12) * 100) / 100;
}

/** A stable key for one physical block. */
export function blockKey(block, streetName) {
  return `${String(block).trim().toUpperCase()}|${String(streetName).trim().toUpperCase()}`;
}
