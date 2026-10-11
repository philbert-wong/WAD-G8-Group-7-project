import { remainingLease } from './lease.js';

// Turns a block from MongoDB into the simple object the frontend shows on a card.
export function toCard(block) {
  const [lng, lat] = block.location.coordinates;
  return {
    id: block._id,
    block: block.block,
    street: block.street,
    town: block.town,
    flatType: block.flatType,
    price: block.price, // median
    priceLow: block.priceLow,
    priceHigh: block.priceHigh,
    salesCount: block.sales.length,
    remainingLease: remainingLease(block.leaseCommenceYear),
    mrtName: block.mrtName,
    mrtWalkMinutes: block.mrtWalkMinutes,
    lat,
    lng,
  };
}
