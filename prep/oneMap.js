// Looks up a place on OneMap and remembers the answer in prep/geocode-cache.json,
// so running the prep script again does not call OneMap again.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { wait } from './wait.js';

const CACHE_FILE = new URL('./geocode-cache.json', import.meta.url);

// Answers we already got: { "314 ANG MO KIO AVE 3": { lat, lng, postal }, "NOWHERE": null, ... }
let cache = {};
if (existsSync(CACHE_FILE)) {
  cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
}

let callsSinceSave = 0;

export function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
}

// Goes through OneMap's results and returns the first one we want, as { lat, lng, postal }.
// accept is a function that says yes/no to one result. No accept function = take the first result.
function firstAcceptedHit(hits, accept) {
  if (!hits) {
    return null;
  }
  for (const hit of hits) {
    if (accept === undefined || accept(hit)) {
      return { lat: Number(hit.LATITUDE), lng: Number(hit.LONGITUDE), postal: hit.POSTAL };
    }
  }
  return null;
}

// searchText: what to type into OneMap, e.g. "314 ANG MO KIO AVE 3" or "560314"
// accept (optional): a function that says whether a result is the one we want
// returns { lat, lng, postal } or null when OneMap found nothing suitable
export async function findPoint(searchText, accept) {
  // Already looked this up before? (null also counts: it means "OneMap found nothing")
  if (cache[searchText] !== undefined) {
    return cache[searchText];
  }

  const url =
    'https://www.onemap.gov.sg/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&searchVal=' +
    encodeURIComponent(searchText);

  let result = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    await wait(1000); // OneMap asks for about one request per second
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      result = firstAcceptedHit(data.results, accept);
      break;
    }
    console.log('  OneMap said ' + response.status + ', waiting before retry ' + attempt + '/4');
    await wait(5000 * attempt);
    if (attempt === 4) {
      throw new Error('OneMap failed for "' + searchText + '" (' + response.status + ')');
    }
  }

  cache[searchText] = result;
  callsSinceSave = callsSinceSave + 1;
  if (callsSinceSave % 20 === 0) {
    saveCache();
  }
  return result;
}
