// The last safety net. Our routes catch their own errors, but some errors happen
// before a route even runs, for example when the request body is broken JSON.
// Express sends those here. (Express knows this is an error handler because it has 4 inputs.)
function errorHandler(err, req, res, next) {
  // Problems with the request itself (like broken JSON) come with a 4xx status
  if (err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
}

module.exports = errorHandler;
