import { describe, expect, it } from 'vitest';
import { computeScore, distanceScore, leaseScore, priceScore } from '../src/lib/score.js';
import { blockIdFor, streetKey } from '../src/lib/streets.js';
import {
  buildBlocks, median, minLeaseCommenceYear, monthToT, parseRemainingLease, remainingLeaseNow, shiftMonth, storeyMid,
} from '../src/lib/resale.js';
import { transactions } from './fixtures.js';

describe('streetKey', () => {
  it.each([
    ['ANG MO KIO AVE 10', 'ANG MO KIO AVENUE 10'],
    ['BT BATOK WEST AVE 6', 'BUKIT BATOK WEST AVENUE 6'],
    ["C'WEALTH CRES", 'COMMONWEALTH CRESCENT'],
    ["ST. GEORGE'S RD", 'SAINT GEORGES ROAD'],
    ['TOA PAYOH LOR 1', 'TOA PAYOH LORONG 1'],
  ])('matches HDB "%s" to OneMap "%s"', (hdb, onemap) => {
    expect(streetKey(hdb)).toBe(streetKey(onemap));
  });

  it('is case-insensitive', () => {
    expect(streetKey('sumang lane')).toBe('SUMANG LANE');
  });
});

describe('distanceScore', () => {
  it('gives 1 when amenity is close', () =>{
    expect(distanceScore(300)).toBe(1);
  });

    it('gives 0 when the amenity is far', () => {
    expect(distanceScore(2500)).toBe(0);
  });

  it('gives 0 when there is no amenity', () => {
    expect(distanceScore(null)).toBe(0);
  });

  it('gives a value in between for a medium distance', () => {
    expect(distanceScore(1150)).toBeCloseTo(0.5);
  });
});

describe('priceScore', () => {
  it('gives 1 at half the budget', () => {
    expect(priceScore(300000, 600000)).toBe(1);
  });

  it('gives 0 at the budget', () => {
    expect(priceScore(600000, 600000)).toBe(0);
  });

  it('gives 0 when the price or budget is missing', () => {
    expect(priceScore(null, 600000)).toBe(0);
    expect(priceScore(400000, null)).toBe(0);
  });
});

describe('leaseScore', () => {
  it('gives 0 at 40 years', () => {
    expect(leaseScore(40)).toBe(0);
  });

  it('gives 1 at 90 years', () => {
    expect(leaseScore(90)).toBe(1);
  });

  it('gives 0 when the lease is missing', () => {
    expect(leaseScore(null)).toBe(0);
  });
});

describe('computeScore', () => {
  const block = { distances: { mrt: 300 }, price: 400000, budget: 600000, remainingLease: 80 };

  it('gives 100 when only a perfect factor has a weight', () => {
    const result = computeScore(block, { mrt: 5 });
    expect(result.score).toBe(100);
  });

  it('gives 0 when every weight is 0', () => {
    const result = computeScore(block, { mrt: 0, hawker: 0, park: 0, school: 0, price: 0, lease: 0 });
    expect(result.score).toBe(0);
  });

  it('includes a breakdown for every factor', () => {
    const result = computeScore(block);
    expect(Object.keys(result.breakdown)).toEqual(['mrt', 'hawker', 'park', 'school', 'price', 'lease']);
  });
});


describe('resale row parsing', () => {
  it('parses storey ranges, leases and months', () => {
    expect(storeyMid('10 TO 12')).toBe(11);
    expect(parseRemainingLease('61 years 04 months')).toBeCloseTo(61.333, 3);
    expect(parseRemainingLease('90 years')).toBe(90);
    expect(monthToT('2017-01')).toBe(0);
    expect(monthToT('2023-07')).toBe(6.5);
    expect(shiftMonth('2026-02', -12)).toBe('2025-02');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(blockIdFor('233C', "ST. GEORGE'S RD")).toBe('233c-st-george-s-rd');
  });

  it('computes medians', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('keeps the lease filter consistent with the displayed remaining lease', () => {
    const now = new Date('2026-10-01');
    const year = minLeaseCommenceYear(60, now);
    expect(remainingLeaseNow(year, now)).toBeGreaterThanOrEqual(60);
    expect(remainingLeaseNow(year - 1, now)).toBeLessThan(60);
  });
});



describe('buildBlocks', () => {
  const blocks = buildBlocks(transactions);
  const amk406 = blocks.find((b) => b._id === '406-ang-mo-kio-ave-10');

  it('creates one block per block number and street', () => {
    expect(blocks).toHaveLength(5);
    expect(amk406.flatTypes.map((f) => f.flatType).sort()).toEqual(['3 ROOM', '4 ROOM']);
  });

  it('uses the median of the latest 12 months when there are recent sales', () => {
    const threeRoom = amk406.flatTypes.find((f) => f.flatType === '3 ROOM');
    expect(threeRoom).toMatchObject({ medianPrice: 360000, salesLast12m: 2, totalSales: 3, priceBasis: 'last12m' });
  });

  it('falls back to the last sales when nothing sold recently', () => {
    const fiveRoom = blocks.find((b) => b.block === '560').flatTypes[0];
    expect(fiveRoom).toMatchObject({ medianPrice: 600000, salesLast12m: 0, priceBasis: 'latest3' });
  });
});
