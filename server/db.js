import mongoose from 'mongoose';

export async function connectDb(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
}

export function disconnectDb() {
  return mongoose.disconnect();
}
