// Small helpers for showing numbers nicely. Used by BlockCard and PriceDetails.

// 600000 -> "$600,000". A missing price shows as "N/A".
export function formatPrice(price) {
  if (price === null || price === undefined) {
    return 'N/A'
  }
  return '$' + price.toLocaleString('en-SG')
}
