// Builds the Express app. Kept separate from index.js so the tests can use it without starting a server.
import express from 'express';
import blocksRouter from './routes/blocks.js';
import shortlistRouter from './routes/shortlist.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json()); // lets us read JSON sent in a POST / PATCH body

  // API routes
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/blocks', blocksRouter);
  app.use('/api/shortlist', shortlistRouter);
  app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

  app.use(errorHandler); // must be last

  return app;
}
