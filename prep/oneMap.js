// Looks up a place on OneMap and remembers the answer in prep/geocode-cache.json,
// so running the prep script again does not call OneMap again.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE_FILE = new URL('./geocode-cache.json', import.meta.url);
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let callsSinceSave = 0;

export function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
}

// searchText: what to type into OneMap, e.g. "406 ANG MO KIO AVE 10" or "560406"
// accept: a function that says whether a result is the one we want
// returns { lat, lng, postal } or null when OneMap found nothing suitable
export async function findPoint(searchText, accept = () => true) {
  if (searchText in cache) return cache[searchText];

  const url = 'https://www.onemap.gov.sg/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&searchVal='
    + encodeURIComponent(searchText);

  let result = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    await sleep(1000); // OneMap asks for about one request per second
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const hit = (data.results ?? []).find(accept);
      if (hit) {
        result = { lat: Number(hit.LATITUDE), lng: Number(hit.LONGITUDE), postal: hit.POSTAL };
      }
      break;
    }
    console.log(`  OneMap said ${response.status}, waiting before retry ${attempt}/4`);
    await sleep(5000 * attempt);
    if (attempt === 4) throw new Error(`OneMap failed for "${searchText}" (${response.status})`);
  }

  cache[searchText] = result;
  if (++callsSinceSave % 20 === 0) saveCache();
  return result;
}
