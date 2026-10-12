// Builds the Express app: JSON body reading, the API routes and the error handler. index.js starts it.
import express from 'express';
import blocksRouter from './routes/blocks.js';
import shortlistRouter from './routes/shortlist.js';
import { errorHandler } from './middleware/errorHandler.js';

// GET /api/health: a quick "is the server running?" check
function healthCheck(req, res) {
  res.json({ status: 'ok' });
}

// Any other /api/... address does not exist
function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

export function createApp() {
  const app = express();

  app.use(express.json()); // lets us read JSON sent in a POST / PATCH body

  // API routes
  app.get('/api/health', healthCheck);
  app.use('/api/blocks', blocksRouter);
  app.use('/api/shortlist', shortlistRouter);
  app.use('/api', notFound);

  app.use(errorHandler); // must be last

  return app;
}
