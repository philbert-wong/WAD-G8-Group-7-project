// Any error thrown inside a route ends up here and becomes { "message": "..." } JSON.
export function errorHandler(err, req, res, next) {
  // Errors we threw on purpose (HttpError) or that Express raised (e.g. bad JSON body) carry a status
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  // MongoDB could not understand an id, e.g. /api/blocks/abc
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' });
  }
  // Mongoose rejected the data, e.g. note too long
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
}
