import { earliestCommenceYear } from './lease.js';
import { isBlank } from './numberCheck.js';

// Characters that have a special meaning in a MongoDB text pattern ($regex)
const SPECIAL_CHARACTERS = '.*+?^${}()|[]\\';

// Puts a \ in front of special characters, so "a.b" is searched as plain text, not as a pattern
function escapeSearchText(text) {
  let safeText = '';
  for (const character of text) {
    if (SPECIAL_CHARACTERS.includes(character)) {
      safeText = safeText + '\\' + character;
    } else {
      safeText = safeText + character;
    }
  }
  return safeText;
}

// Turns the query string (?q=punggol&maxPrice=600000...) into a MongoDB filter object.
// The route has already checked that the number filters really are numbers.
//
//   q          search text, matches block number, street or town
//   flatType   e.g. "4 ROOM"
//   maxPrice   budget in dollars
//   minLease   minimum remaining lease in years
//   maxWalk    maximum walking minutes to the MRT
export function buildFilter(query) {
  const filter = {};

  if (query.q) {
    const text = escapeSearchText(String(query.q).trim());
    // $options: 'i' = ignore upper/lower case
    filter.$or = [
      { block: { $regex: text, $options: 'i' } },
      { street: { $regex: text, $options: 'i' } },
      { town: { $regex: text, $options: 'i' } },
    ];
  }

  if (query.flatType) {
    filter.flatType = String(query.flatType);
  }

  if (!isBlank(query.maxPrice)) {
    filter.price = { $lte: Number(query.maxPrice) }; // $lte = less than or equal
  }

  if (!isBlank(query.minLease)) {
    // $gte = greater than or equal
    filter.leaseCommenceYear = { $gte: earliestCommenceYear(Number(query.minLease)) };
  }

  if (!isBlank(query.maxWalk)) {
    filter.mrtWalkMinutes = { $lte: Number(query.maxWalk) };
  }

  return filter;
}
