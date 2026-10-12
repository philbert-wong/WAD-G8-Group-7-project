// Starts the server: connect to MongoDB, then listen for requests.
import { createApp } from './app.js';
import { mongoUri, port } from './config.js';
import { connectDb } from './db.js';

try {
  await connectDb(mongoUri);
  console.log('MongoDB connected');
} catch (error) {
  console.error('Could not connect to MongoDB. Check MONGODB_URI in your .env file.');
  console.error(error.message);
  process.exit(1);
}

// Express calls this once the server has started, or if starting failed
// (then "error" says why, e.g. the port is already used by another program).
function onListening(error) {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        'Port ' + port + ' is already in use. Stop the other program, or set a different PORT in .env',
      );
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
  console.log('API running on http://localhost:' + port);
}

createApp().listen(port, onListening);
