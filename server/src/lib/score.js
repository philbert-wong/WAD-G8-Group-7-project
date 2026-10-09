export const DEFAULT_WEIGHTS = { mrt: 3, hawker: 2, park: 1, school: 2, price: 3, lease: 2};

const convert = (x) => Math.min(1, Math.max(0,x));

export function distanceScore(metres){
    if (metres == null){
        return 0;
    }
    return convert((2000 - metres) / 1700);
}

export function priceScore (price, budget) {
    if(price == null || !budget){
        return 0;
    }
    return convert((budget - price ) / (budget * 0.5));
}

export function leaseScore (years) {
    if (years == null){
        return 0;
    }
    return convert((years - 40)/ 50)
}

export function computeScore({ distances, price, budget, remainingLease }, weights = DEFAULT_WEIGHTS) {
  const parts = {
    mrt: distanceScore(distances.mrt),
    hawker: distanceScore(distances.hawker),
    park: distanceScore(distances.park),
    school: distanceScore(distances.school),
    price: priceScore(price, budget),
    lease: leaseScore(remainingLease),
  };

  let sum = 0;
  let total = 0;
  for (const [key, value] of Object.entries(parts)) {
    const weight = weights[key] ?? 0;
    sum += weight * value;
    total += weight;
  }

  const score = total === 0 ? 0 : Math.round((sum / total) * 1000) / 10;
  return { score, breakdown: parts };
}


