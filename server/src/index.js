import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';

try {
  await connectDb();
} catch (err) {
  console.error(`Could not connect to MongoDB at ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
  console.error('Set MONGODB_URI in server/.env, or start a local database with: npm run db:local');
  console.error(err.message);
  process.exit(1);
}

createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
