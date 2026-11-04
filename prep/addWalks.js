// Measures the REAL walk from each block to its nearest MRT / LRT station with OneMap's walking routes,
// and saves it on every card in server/data/blocks.json as  walk: { station, metres }.
// The seed then uses it for the nearest station, the walking minutes and the Transport part of the match score,
// so all three come from the same walk (a straight line ignores roads, fences and canals).
//
//   cd prep
//   node addWalks.js      (about 20-30 minutes the first time; every answer is saved in prep/walk-cache.json,
//                          so running it again is quick)
// then, in the server folder:  pnpm seed
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { straightLineDistance } from './straightLineDistance.js';
import { wait } from './wait.js';

// OneMap's walking routes need a login: the same ONEMAP_EMAIL / ONEMAP_PASSWORD as the server.
// process.loadEnvFile is built into Node (no extra package): it puts server/config.env's settings into process.env.
process.loadEnvFile('../server/config.env');

// If the second-nearest station (in a straight line) is at most this many times as far as the nearest,
// measure the walk to it too: with roads in the way, the shorter WALK can be to the second one.
const SECOND_STATION_FACTOR = 1.5;

const BLOCKS_FILE = new URL('../server/data/blocks.json', import.meta.url);
const AMENITIES_FILE = new URL('../server/data/amenities.json', import.meta.url);
const CACHE_FILE = new URL('./walk-cache.json', import.meta.url);

const blocksText = readFileSync(BLOCKS_FILE, 'utf8');
const blocksData = JSON.parse(blocksText);
// Windows line endings (\r\n) in the file? Then write it back the same way, so git only shows the new lines
const windowsLineEndings = blocksText.includes('\r\n');
const amenities = JSON.parse(readFileSync(AMENITIES_FILE, 'utf8'));

// Just the stations (MRT and LRT are both stored as category 'mrt')
const stations = [];
for (const amenity of amenities) {
  if (amenity.category === 'mrt') {
    stations.push(amenity);
  }
}

// ---------- Saved answers ----------
// { "1.36791,103.84771 > Ang Mo Kio MRT": 646, ... }  (null = OneMap found no route)
let cache = {};
if (existsSync(CACHE_FILE)) {
  cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
}
let callsSinceSave = 0;

function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
}

// ---------- OneMap login ----------
let token = null;

async function getToken() {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ONEMAP_EMAIL, password: process.env.ONEMAP_PASSWORD }),
  });
  if (!response.ok) {
    throw new Error('OneMap login failed (' + response.status + '). Check ONEMAP_EMAIL / ONEMAP_PASSWORD in server/config.env');
  }
  const data = await response.json();
  return data.access_token;
}

// ---------- One walk ----------

// Walking metres from a block to a station along real paths, or null when OneMap has no route.
// OneMap wants "lat,lng" for both ends.
async function walkingMetres(block, station) {
  const key = block.lat + ',' + block.lng + ' > ' + station.name;
  if (cache[key] !== undefined) {
    return cache[key];
  }

  const url =
    'https://www.onemap.gov.sg/api/public/routingsvc/route?start=' + block.lat + ',' + block.lng +
    '&end=' + station.lat + ',' + station.lng + '&routeType=walk';

  let metres = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    await wait(300); // OneMap allows up to 250 requests a minute; each request also takes about a second itself
    const response = await fetch(url, { headers: { Authorization: token } });
    if (response.ok) {
      const data = await response.json();
      if (data.route_summary) {
        metres = data.route_summary.total_distance;
      }
      break;
    }
    console.log('  OneMap said ' + response.status + ', waiting before retry ' + attempt + '/4');
    await wait(5000 * attempt);
  }

  cache[key] = metres;
  callsSinceSave = callsSinceSave + 1;
  if (callsSinceSave % 20 === 0) {
    saveCache();
  }
  return metres;
}

// ---------- Which stations to measure ----------

// The nearest station in a straight line, plus the second-nearest if it is almost as close
function stationsToTry(block) {
  let nearest = null;
  let nearestMetres = null;
  let second = null;
  let secondMetres = null;

  for (const station of stations) {
    const metres = straightLineDistance([block.lat, block.lng], [station.lat, station.lng]);
    if (nearestMetres === null || metres < nearestMetres) {
      // the old nearest becomes the second-nearest
      second = nearest;
      secondMetres = nearestMetres;
      nearest = station;
      nearestMetres = metres;
    } else if (secondMetres === null || metres < secondMetres) {
      second = station;
      secondMetres = metres;
    }
  }

  const list = [nearest];
  if (second !== null && secondMetres <= nearestMetres * SECOND_STATION_FACTOR) {
    list.push(second);
  }
  return list;
}

// ---------- Main ----------

// Every flat type of a block is at the same spot, so group the cards by address and measure each block once
const addresses = {}; // { "314|ANG MO KIO AVE 3": [card, card], ... }
const addressKeys = [];
for (const card of blocksData.blocks) {
  const key = card.block + '|' + card.street;
  if (addresses[key] === undefined) {
    addresses[key] = [];
    addressKeys.push(key);
  }
  addresses[key].push(card);
}
console.log(addressKeys.length + ' blocks, ' + stations.length + ' stations');

token = await getToken();

let done = 0;
let missing = 0;
for (const key of addressKeys) {
  const cards = addresses[key];
  const block = cards[0];

  // Measure the walk to each station worth trying, and keep the shortest
  let bestStation = null;
  let bestMetres = null;
  for (const station of stationsToTry(block)) {
    const metres = await walkingMetres(block, station);
    if (metres !== null && (bestMetres === null || metres < bestMetres)) {
      bestStation = station;
      bestMetres = metres;
    }
  }

  // Save it on every flat type of this block (no route found = no walk; the seed then uses its estimate)
  for (const card of cards) {
    if (bestStation !== null) {
      card.walk = { station: bestStation.name, metres: Math.round(bestMetres) };
    } else {
      delete card.walk;
    }
  }
  if (bestStation === null) {
    missing = missing + 1;
    console.log('  no walking route for Blk ' + block.block + ' ' + block.street);
  }

  done = done + 1;
  if (done % 50 === 0) {
    console.log('  ' + done + ' / ' + addressKeys.length + ' blocks');
  }
}
saveCache();

let newText = JSON.stringify(blocksData, null, 1);
if (windowsLineEndings) {
  newText = newText.replaceAll('\n', '\r\n');
}
writeFileSync(BLOCKS_FILE, newText);
console.log('Saved walks for ' + (addressKeys.length - missing) + ' blocks (' + missing + ' without a route).');
console.log('Now run  pnpm seed  in the server folder.');
