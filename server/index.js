// Starts the server: connect to MongoDB, then listen for requests.
import { createApp } from './app.js';
import { mongoUri, port } from './config.js';
import { connectDb } from './db.js';

try {
  await connectDb(mongoUri);
  console.log('MongoDB connected');
} catch (err) {
  console.error('Could not connect to MongoDB. Check MONGODB_URI in your .env file.');
  console.error(err.message);
  process.exit(1);
}

// The function we pass to listen() is also called if starting FAILED, with the error as its first argument.
createApp().listen(port, (err) => {
  if (err) {
    console.error(
      err.code === 'EADDRINUSE'
        ? `Port ${port} is already in use. Stop the other program, or set a different PORT in .env`
        : err.message,
    );
    process.exit(1);
  }
  console.log(`API running on http://localhost:${port}`);
});
