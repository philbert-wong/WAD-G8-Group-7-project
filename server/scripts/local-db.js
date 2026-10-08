// Runs a local MongoDB on port 27017 for development, with data kept in server/.localdb.
// Use this if you don't want to set up MongoDB Atlas yet. Leave it running in its own terminal.
//   npm run db:local
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = fileURLToPath(new URL('../.localdb', import.meta.url));
mkdirSync(dbPath, { recursive: true });

console.log('Starting local MongoDB (the first run downloads the MongoDB binary, ~100 MB)...');
const server = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' },
});
console.log(`Local MongoDB ready at ${server.getUri()} - data is saved in server/.localdb. Press Ctrl+C to stop.`);

async function stop() {
  await server.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
