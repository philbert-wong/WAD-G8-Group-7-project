import 'dotenv/config';

// Settings come from the .env file (see .env.example). When a setting is missing, we use a default.

// Which port the API listens on
export let port = 8000;
if (process.env.PORT) {
  port = Number(process.env.PORT);
}

// Which MongoDB to use. The default is a MongoDB running on this computer.
export let mongoUri = 'mongodb://127.0.0.1:27017/check-in';
if (process.env.MONGODB_URI) {
  mongoUri = process.env.MONGODB_URI;
}

export let jwtSecret = 'dev-secret-change-me'
if (process.env.JWT_SECRET){
  jwtSecret = process.env.JWT_SECRET
}


// OneMap login (free account at onemap.gov.sg). Needed for the walking-route API, and soon for place search.
export let oneMapEmail = '';
if (process.env.ONEMAP_EMAIL) {
  oneMapEmail = process.env.ONEMAP_EMAIL;
}

export let oneMapPassword = '';
if (process.env.ONEMAP_PASSWORD) {
  oneMapPassword = process.env.ONEMAP_PASSWORD;
}
