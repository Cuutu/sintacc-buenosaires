import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    // Vercel serverless: muchas lambdas × pool default (~100) = Atlas al límite.
    // Pool chico + min 0 deja caer idle y evita picos 500/500.
    // family:4 evita rarezas SRV/IPv6 → TLS alert internal error en algunos runtimes.
    const opts = {
      bufferCommands: false,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 5),
      minPoolSize: 0,
      maxIdleTimeMS: 10_000,
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 45_000,
      family: 4 as const,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
