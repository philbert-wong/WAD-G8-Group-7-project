// Builds the Express app: JSON body reading, the API routes and the error handler. index.js starts it.
import express from 'express';
import cors from 'cors';
import blocksRouter from './routes/blocks-routes.js';
import shortlistRouter from './routes/shortlist-routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth-routes.js';

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

  // Lets our Vue site (a different port, e.g. localhost:5173) read this API's answers. Same one line as the class servers.
  app.use(cors());
  app.use(express.json()); // lets us read JSON sent in a POST / PATCH body

  // API routes
  app.get('/api/health', healthCheck);
  app.use('/api/blocks', blocksRouter);
  app.use('/api/shortlist', shortlistRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', notFound);

  app.use(errorHandler); // must be last

  return app;
}
