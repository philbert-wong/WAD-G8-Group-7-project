export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function optionalNumber(value, name) {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${name} must be a number`);
  return n;
}

export function requiredString(value, name, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpError(400, `${name} is required`);
  }
  return value.trim();
}
