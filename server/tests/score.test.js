import { describe, expect, it } from 'vitest';
import { getWeights, makeDefaultPreferences, matchScore, subScore } from '../../client/src/utils/matchScore.js';
import { earliestCommenceYear, remainingLease } from '../models/block-model.js';
import { straightLineDistance } from '../models/amenity-model.js';

// Same max distance (1000 m) for all 4 categories, so the numbers are easy to check by hand
const maxDistances = { school: 1000, mrt: 1000, hawker: 1000, park: 1000 };
const distances = { school: 900, mrt: 400, hawker: 300, park: 600 };

describe('subScore', () => {
  it('gives 10, 60, 70 and 40 for the example distances', () => {
    expect(subScore(900, 1000)).toBe(10);
    expect(subScore(400, 1000)).toBe(60);
    expect(subScore(300, 1000)).toBe(70);
    expect(subScore(600, 1000)).toBe(40);
  });

  it('gives 0 when the distance is beyond the max distance', () => {
    expect(subScore(1500, 1000)).toBe(0);
  });
});

describe('matchScore', () => {
  it('scores 37 for a young family', () => {
    // (5*10 + 3*60 + 2*70 + 1*40) / (5+3+2+1) = 410 / 11 = 37.27
    const weights = { school: 5, mrt: 3, hawker: 2, park: 1 };
    expect(matchScore(distances, weights, maxDistances)).toBe(37);
  });

  it('scores 58 for a retired couple', () => {
    // (0*10 + 3*60 + 5*70 + 4*40) / (0+3+5+4) = 690 / 12 = 57.5
    const weights = { school: 0, mrt: 3, hawker: 5, park: 4 };
    expect(matchScore(distances, weights, maxDistances)).toBe(58);
  });

  it('has no score when every weight is 0', () => {
    const weights = { school: 0, mrt: 0, hawker: 0, park: 0 };
    expect(matchScore(distances, weights, maxDistances)).toBe(null);
  });

  it('has no score when the block has no distances stored', () => {
    const weights = { school: 3, mrt: 3, hawker: 3, park: 3 };
    expect(matchScore(undefined, weights, maxDistances)).toBe(null);
  });
});

describe('panel to weights', () => {
  it('starts with every category ticked at Important (3)', () => {
    expect(getWeights(makeDefaultPreferences())).toEqual({ school: 3, mrt: 3, hawker: 3, park: 3 });
  });

  it('gives weight 0 to an unticked category', () => {
    const preferences = makeDefaultPreferences();
    preferences.park.ticked = false;
    preferences.school.level = 5;
    expect(getWeights(preferences)).toEqual({ school: 5, mrt: 3, hawker: 3, park: 0 });
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
