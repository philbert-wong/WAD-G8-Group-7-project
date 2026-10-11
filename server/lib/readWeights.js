import { DEFAULT_WEIGHTS } from './score.js';
import { toNumber } from './toNumber.js';

// Reads ?mrt=5&park=0 from the query string. Weights you do not send keep their default.
// Each weight is kept between 0 (don't care) and 5 (very important).
export function readWeights(query) {
  const weights = { ...DEFAULT_WEIGHTS };

  for (const factor of Object.keys(weights)) {
    const value = toNumber(query[factor], factor);
    if (value !== null) {
      weights[factor] = Math.min(5, Math.max(0, value));
    }
  }

  return weights;
}
