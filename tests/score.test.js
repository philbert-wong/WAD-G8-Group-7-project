import { describe, expect, it } from 'vitest';
import { computeScore, distanceScore, leaseScore, priceScore } from '../server/lib/score.js';
import { earliestCommenceYear, remainingLease } from '../server/lib/lease.js';
import { straightLineDistance } from '../server/lib/straightLineDistance.js';

describe('score parts', () => {
  it('gives a high distance score to close places', () => {
    expect(distanceScore(100)).toBe(1);
    expect(distanceScore(1000)).toBeGreaterThan(0);
    expect(distanceScore(1000)).toBeLessThan(1);
    expect(distanceScore(3000)).toBe(0);
  });

  it('gives 0 when something is missing', () => {
    expect(distanceScore(null)).toBe(0);
    expect(priceScore(null, 600000)).toBe(0);
    expect(leaseScore(null)).toBe(0);
  });

  it('likes prices well under budget', () => {
    expect(priceScore(300000, 600000)).toBe(1);
    expect(priceScore(600000, 600000)).toBe(0);
    expect(priceScore(700000, 600000)).toBe(0);
  });

  it('likes long leases', () => {
    expect(leaseScore(95)).toBe(1);
    expect(leaseScore(40)).toBe(0);
  });
});

describe('computeScore', () => {
  const close = { mrt: 100, hawker: 100, park: 100, school: 100 };

  it('is 100 when everything is perfect', () => {
    const { score } = computeScore({ distances: close, price: 300000, budget: 600000, remainingLease: 95 });
    expect(score).toBe(100);
  });

  it('is 0 when everything is bad', () => {
    const far = { mrt: 5000, hawker: 5000, park: 5000, school: 5000 };
    const { score } = computeScore({ distances: far, price: 700000, budget: 600000, remainingLease: 30 });
    expect(score).toBe(0);
  });

  it('leaves price out when there is no budget', () => {
    const { score } = computeScore({ distances: close, price: 900000, budget: null, remainingLease: 95 });
    expect(score).toBe(100);
  });

  it('follows the weights', () => {
    const input = { distances: { mrt: 100, hawker: 5000, park: 5000, school: 5000 }, price: null, budget: null, remainingLease: 40 };
    const mrtMatters = computeScore(input, { mrt: 5, hawker: 0, park: 0, school: 0, price: 0, lease: 0 });
    const mrtIgnored = computeScore(input, { mrt: 0, hawker: 5, park: 0, school: 0, price: 0, lease: 0 });
    expect(mrtMatters.score).toBe(100);
    expect(mrtIgnored.score).toBe(0);
  });
});

describe('lease and distance helpers', () => {
  it('works out remaining lease', () => {
    expect(remainingLease(1990, 2026)).toBe(63);
  });

  it('works out the earliest start year for a minimum lease', () => {
    expect(earliestCommenceYear(63, 2026)).toBe(1990);
  });

  it('measures distance between two points in metres', () => {
    // about 111 km per degree of latitude
    const metres = straightLineDistance([1.0, 103.8], [1.01, 103.8]);
    expect(metres).toBeGreaterThan(1100);
    expect(metres).toBeLessThan(1120);
  });
});
