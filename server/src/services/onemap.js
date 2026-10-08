import { setTimeout as sleep } from 'node:timers/promises';
import { config } from '../config.js';
import { Block } from '../models/Block.js';
import { streetKey } from '../lib/streets.js';

const SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
// Without a token OneMap answers about one search per second (HTTP 429 beyond that);
// with a token the documented limit is 250 per minute.
const MIN_GAP_MS = config.onemapToken ? 250 : 1100;

let queue = Promise.resolve();
function throttled(task) {
  const run = queue.then(task);
  queue = run.catch(() => {}).then(() => sleep(MIN_GAP_MS));
  return run;
}

export function searchOneMap(searchVal) {
  return throttled(async () => {
    const url = new URL(SEARCH_URL);
    url.search = new URLSearchParams({ searchVal, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1' });
    const headers = config.onemapToken ? { Authorization: config.onemapToken } : {};
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (res.status === 429 && attempt < 2) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`OneMap search failed: HTTP ${res.status}`);
      return (await res.json()).results ?? [];
    }
  });
}

// Find coordinates for one HDB block. Returns null when OneMap has no matching block.
export async function geocodeBlock({ block, street }) {
  const results = await searchOneMap(`${block} ${street}`);
  const key = streetKey(street);
  const match = results.find((r) => r.BLK_NO === block && streetKey(r.ROAD_NAME) === key)
    ?? results.find((r) => r.BLK_NO === block);
  if (!match) return null;
  return {
    postal: match.POSTAL !== 'NIL' ? match.POSTAL : undefined,
    location: { type: 'Point', coordinates: [Number(match.LONGITUDE), Number(match.LATITUDE)] },
  };
}

const inFlight = new Map();

function geocodeAndCache(b) {
  const id = b._id;
  if (!inFlight.has(id)) {
    const task = geocodeBlock(b)
      .then(async (geo) => {
        const update = geo ?? { geocodeFailed: true };
        await Block.updateOne({ _id: id }, { $set: update });
        return update;
      })
      .catch((err) => {
        console.warn(`Geocoding ${b.block} ${b.street} failed: ${err.message}`);
        return null;
      })
      .finally(() => inFlight.delete(id));
    inFlight.set(id, task);
  }
  return inFlight.get(id).then((update) => update && Object.assign(b, update));
}

/**
 * Geocode the blocks that have no coordinates yet, caching results on the Block documents.
 * With `waitMs`, returns after that long even if some lookups are still queued; those finish
 * in the background and show up on the next request.
 */
export async function ensureGeocoded(blocks, { waitMs } = {}) {
  const pending = blocks.filter((b) => !b.location?.coordinates?.length && !b.geocodeFailed);
  const all = Promise.all(pending.map(geocodeAndCache));
  await (waitMs == null ? all : Promise.race([all, sleep(waitMs)]));
  return blocks;
}
