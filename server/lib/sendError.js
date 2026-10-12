// Used in the catch block of every route: sends the right error answer to the frontend.
export function sendError(res, error) {
  // MongoDB could not understand an id, e.g. /api/blocks/abc
  if (error.name === 'CastError') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  // Mongoose rejected the data, e.g. a note longer than 500 letters
  if (error.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  // Anything else is a bug or a database problem: log it for us, keep the message simple for the user
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
}
