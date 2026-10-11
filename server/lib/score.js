// PERSONALISED SCORE (0 to 100)
//
// Every factor is first turned into a number from 0 (bad) to 1 (great).
// Then we take a weighted average: the more you care about something, the higher its weight.

export const DEFAULT_WEIGHTS = { mrt: 3, hawker: 2, park: 1, school: 2, price: 3, lease: 2 };

// keep a number between 0 and 1
function clamp(x) {
  return Math.min(1, Math.max(0, x));
}

// 300m or closer = 1, 2000m or further = 0
export function distanceScore(metres) {
  if (metres == null) return 0;
  return clamp((2000 - metres) / 1700);
}

// at your budget = 0, half your budget or less = 1
export function priceScore(price, budget) {
  if (price == null || !budget) return 0;
  return clamp((budget - price) / (budget * 0.5));
}

// 40 years left or less = 0, 90 years or more = 1
export function leaseScore(years) {
  if (years == null) return 0;
  return clamp((years - 40) / 50);
}

// distances = { mrt: 350, hawker: 800, park: 500, school: 900 } (metres)
export function computeScore({ distances, price, budget, remainingLease }, weights = DEFAULT_WEIGHTS) {
  const breakdown = {
    mrt: distanceScore(distances.mrt),
    hawker: distanceScore(distances.hawker),
    park: distanceScore(distances.park),
    school: distanceScore(distances.school),
    price: priceScore(price, budget),
    lease: leaseScore(remainingLease),
  };

  // If no budget was given we cannot judge the price, so leave price out
  const usedWeights = { ...weights };
  if (!budget) usedWeights.price = 0;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const factor of Object.keys(breakdown)) {
    weightedSum += usedWeights[factor] * breakdown[factor];
    totalWeight += usedWeights[factor];
  }

  const score = totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 1000) / 10;
  return { score, breakdown };
}
