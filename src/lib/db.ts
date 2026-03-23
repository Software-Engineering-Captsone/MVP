import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose;

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB when `MONGODB_URI` is set.
 * Auth and campaigns use local JSON stores by default.
 */
async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. This project uses local file stores for auth and campaigns; only call dbConnect() from routes that explicitly require MongoDB.'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
