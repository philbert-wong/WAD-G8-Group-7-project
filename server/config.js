import 'dotenv/config';

// Settings come from the .env file (see .env.example). When a setting is missing, we use a default.

// Which port the API listens on
export let port = 3030;
if (process.env.PORT) {
  port = Number(process.env.PORT);
}

// Which MongoDB to use. The default is a MongoDB running on this computer.
export let mongoUri = 'mongodb://127.0.0.1:27017/check-in';
if (process.env.MONGODB_URI) {
  mongoUri = process.env.MONGODB_URI;
}
