import { blockIdFor, streetKey } from './streets.js';

export const LEASE_YEARS = 99;
const BASE_YEAR = 2017;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// "10 TO 12" -> 11
export function storeyMid(range) {
  const [lo, hi] = range.split(' TO ').map(Number);
  return (lo + hi) / 2;
}

// "61 years 04 months" -> 61.33
export function parseRemainingLease(text) {
  const years = Number(/(\d+)\s*year/.exec(text)?.[1] ?? NaN);
  const months = Number(/(\d+)\s*month/.exec(text)?.[1] ?? 0);
  return years + months / 12;
}

// "2023-07" -> 6.5 (years since Jan 2017)
export function monthToT(month) {
  const [y, m] = month.split('-').map(Number);
  return y - BASE_YEAR + (m - 1) / 12;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function remainingLeaseNow(leaseCommenceYear, now = new Date()) {
  const elapsed = now.getFullYear() + now.getMonth() / 12 - leaseCommenceYear;
  return Math.round((LEASE_YEARS - elapsed) * 10) / 10;
}

// Inverse of remainingLeaseNow: blocks with at least `minLease` years left started on or after this year.
export function minLeaseCommenceYear(minLease, now = new Date()) {
  return Math.ceil(now.getFullYear() + now.getMonth() / 12 - LEASE_YEARS + minLease);
}

// Raw data.gov.sg CSV row -> Transaction document
export function parseResaleRow(row) {
  const floorArea = Number(row.floor_area_sqm);
  const price = Number(row.resale_price);
  return {
    blockId: blockIdFor(row.block, row.street_name),
    town: row.town,
    flatType: row.flat_type,
    block: row.block,
    street: row.street_name,
    month: row.month,
    t: monthToT(row.month),
    storeyRange: row.storey_range,
    storeyMid: storeyMid(row.storey_range),
    floorArea,
    flatModel: row.flat_model,
    leaseCommenceYear: Number(row.lease_commence_date),
    remainingLease: parseRemainingLease(row.remaining_lease),
    price,
    pricePsm: Math.round(price / floorArea),
  };
}

// Group transactions into one Block document per block, with price stats per flat type.
export function buildBlocks(transactions) {
  const latestMonth = transactions.reduce((max, tx) => (tx.month > max ? tx.month : max), '');
  const windowStart = shiftMonth(latestMonth, -12); // exclusive
  const blocks = new Map();

  for (const tx of transactions) {
    let block = blocks.get(tx.blockId);
    if (!block) {
      block = {
        _id: tx.blockId,
        block: tx.block,
        street: tx.street,
        streetKey: streetKey(tx.street),
        town: tx.town,
        leaseCommenceYear: tx.leaseCommenceYear,
        byType: new Map(),
      };
      blocks.set(tx.blockId, block);
    }
    if (!block.byType.has(tx.flatType)) block.byType.set(tx.flatType, []);
    block.byType.get(tx.flatType).push(tx);
  }

  return [...blocks.values()].map(({ byType, ...block }) => ({
    ...block,
    flatTypes: [...byType.entries()].map(([flatType, sales]) => {
      sales.sort((a, b) => a.month.localeCompare(b.month));
      const recent = sales.filter((s) => s.month > windowStart);
      const basis = recent.length ? recent : sales.slice(-3);
      const last = sales.at(-1);
      return {
        flatType,
        medianPrice: median(basis.map((s) => s.price)),
        medianPricePsm: median(basis.map((s) => s.pricePsm)),
        medianFloorArea: median(basis.map((s) => s.floorArea)),
        salesLast12m: recent.length,
        totalSales: sales.length,
        lastSaleMonth: last.month,
        lastSalePrice: last.price,
        priceBasis: recent.length ? 'last12m' : 'latest3',
      };
    }),
  }));
}
