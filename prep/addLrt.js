// Adds the LRT stations near our blocks (Punggol LRT and Sengkang LRT) to server/data/amenities.json,
// without rebuilding everything (makeData.js would need the resale CSV again).
// They are stored with the MRT stations (category 'mrt', e.g. "Cove LRT"), so the nearest-station walk,
// the match score's Transport part and the map's station layer all include them.
//
//   cd prep
//   node addLrt.js
// then, in the server folder:  pnpm seed   (works out each block's nearest station again)
import { readFileSync, writeFileSync } from 'node:fs';
import { findPoint, saveCache } from './oneMap.js';

// Punggol LRT (East and West loops) and Sengkang LRT (East and West loops)
const LRT_STATIONS = [
  'Cove', 'Meridian', 'Coral Edge', 'Riviera', 'Kadaloor', 'Oasis', 'Damai',
  'Sam Kee', 'Teck Lee', 'Punggol Point', 'Samudera', 'Nibong', 'Sumang', 'Soo Teck',
  'Compassvale', 'Rumbia', 'Bakau', 'Kangkar', 'Ranggung',
  'Cheng Lim', 'Farmway', 'Kupang', 'Thanggam', 'Fernvale', 'Layar', 'Tongkang', 'Renjong',
];

// Only accept OneMap results that really are an LRT station (same idea as isMrtStation in makeData.js)
function isLrtStation(hit) {
  return String(hit.SEARCHVAL).toUpperCase().includes('LRT STATION');
}

const AMENITIES_FILE = new URL('../server/data/amenities.json', import.meta.url);
const amenities = JSON.parse(readFileSync(AMENITIES_FILE, 'utf8'));

// Names already in the file, so running this script twice does not add the stations twice
const existingNames = [];
for (const amenity of amenities) {
  existingNames.push(amenity.name);
}

let added = 0;
for (const name of LRT_STATIONS) {
  const fullName = name + ' LRT';
  if (existingNames.includes(fullName)) {
    console.log('  already there: ' + fullName);
    continue;
  }

  const point = await findPoint(name + ' LRT STATION', isLrtStation);
  if (point) {
    amenities.push({ category: 'mrt', name: fullName, lat: point.lat, lng: point.lng });
    added = added + 1;
    console.log('  added ' + fullName);
  } else {
    console.log('  no match for ' + fullName);
  }
}
saveCache();

writeFileSync(AMENITIES_FILE, JSON.stringify(amenities, null, 1));
console.log('Added ' + added + ' LRT stations. Now run  pnpm seed  in the server folder.');
