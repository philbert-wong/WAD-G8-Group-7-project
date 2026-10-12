import { remainingLease } from './lease.js';

// Turns a block from MongoDB into the simple object the frontend shows on a card.
export function toCard(block) {
  // MongoDB stores the position as [longitude, latitude]
  const lng = block.location.coordinates[0];
  const lat = block.location.coordinates[1];

  // How many recent sales the price range is based on
  let salesCount = 0;
  if (block.sales) {
    salesCount = block.sales.length;
  }

  return {
    id: block._id,
    block: block.block,
    street: block.street,
    town: block.town,
    flatType: block.flatType,
    price: block.price, // median
    priceLow: block.priceLow,
    priceHigh: block.priceHigh,
    salesCount: salesCount,
    remainingLease: remainingLease(block.leaseCommenceYear),
    mrtName: block.mrtName,
    mrtWalkMinutes: block.mrtWalkMinutes,
    distances: block.distances, // nearest school, mrt, hawker, park in metres (for the match score)
    lat: lat,
    lng: lng,
  };
}
