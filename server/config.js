import 'dotenv/config';

// Settings come from the .env file (see .env.example)
export const port = Number(process.env.PORT) || 3030;
export const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/check-in';
