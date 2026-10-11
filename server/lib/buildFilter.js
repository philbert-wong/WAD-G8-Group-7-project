import { earliestCommenceYear } from './lease.js';
import { toNumber } from './toNumber.js';

// Turns the query string (?q=punggol&maxPrice=600000...) into a MongoDB filter object.
//
//   q          search text, matches block number, street or town
//   flatType   e.g. "4 ROOM"
//   maxPrice   budget in dollars
//   minLease   minimum remaining lease in years
//   maxWalk    maximum walking minutes to the MRT
export function buildFilter(query) {
  const filter = {};

  if (query.q) {
    // escape special characters so "a.b" is searched as text, not as a pattern
    const text = String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(text, 'i'); // 'i' = ignore upper/lower case
    filter.$or = [{ block: pattern }, { street: pattern }, { town: pattern }];
  }

  if (query.flatType) {
    filter.flatType = String(query.flatType);
  }

  const maxPrice = toNumber(query.maxPrice, 'maxPrice');
  if (maxPrice !== null) {
    filter.price = { $lte: maxPrice }; // $lte = less than or equal
  }

  const minLease = toNumber(query.minLease, 'minLease');
  if (minLease !== null) {
    filter.leaseCommenceYear = { $gte: earliestCommenceYear(minLease) }; // $gte = greater than or equal
  }

  const maxWalk = toNumber(query.maxWalk, 'maxWalk');
  if (maxWalk !== null) {
    filter.mrtWalkMinutes = { $lte: maxWalk };
  }

  return filter;
}
