import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hdb-resale',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001',
  // Optional: OneMap search works without a token today, but OneMap asks clients to send one.
  onemapToken: process.env.ONEMAP_TOKEN || '',
  dnsServers: (process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean),
};
