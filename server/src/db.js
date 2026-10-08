import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './config.js';

// Some networks (e.g. phone hotspots) answer the SRV lookup that mongodb+srv:// needs with a
// reply Node cannot parse (querySrv EBADRESP). DNS_SERVERS lets you point Node at public DNS instead.
if (config.dnsServers.length) dns.setServers(config.dnsServers);

export async function connectDb(uri = config.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

export function disconnectDb() {
  return mongoose.disconnect();
}
