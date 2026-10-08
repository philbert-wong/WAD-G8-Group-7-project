import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import analysisRouter from './routes/analysis.js';
import blocksRouter from './routes/blocks.js';
import metaRouter from './routes/meta.js';
import shortlistRouter from './routes/shortlist.js';

const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/meta', metaRouter);
  app.use('/api/blocks', blocksRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/shortlist', shortlistRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // In production Express also serves the built Vue app, so http://host:port/ is the home page.
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(clientDist, 'index.html')) : next()));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: err.message });
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
  });

  return app;
}
