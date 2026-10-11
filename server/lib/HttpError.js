// Use it like:  throw new HttpError(404, 'Block not found');
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
