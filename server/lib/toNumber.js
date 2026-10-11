import { HttpError } from './HttpError.js';

// Query strings are always text. This turns "600000" into 600000.
// Returns null when the value was not sent, and throws a 400 error when it is not a number.
export function toNumber(value, name) {
  if (value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, `${name} must be a number`);
  }
  return number;
}
