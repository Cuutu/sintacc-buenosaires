import mongoose from "mongoose"

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

function isTransientMongoNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes("TLS") ||
    msg.includes("SSL") ||
    msg.includes("tlsv1 alert") ||
    msg.includes("PoolClearedError") ||
    msg.includes("MongoNetworkError") ||
    msg.includes("MongoServerSelectionError") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function connectWithRetry(uri: string) {
  // Vercel serverless: pool chico. family:4 + autoSelectFamily:false
  // mitiga TLS alert 80 / IPv6 happy-eyeballs en algunos runtimes.
  const opts = {
    bufferCommands: false,
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 5),
    minPoolSize: 0,
    maxIdleTimeMS: 10_000,
    serverSelectionTimeoutMS: 8_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 10_000,
    family: 4 as const,
    autoSelectFamily: false,
  }

  const maxAttempts = 3
  let lastErr: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await mongoose.connect(uri, opts)
    } catch (err) {
      lastErr = err
      try {
        await mongoose.disconnect()
      } catch {
        /* ignore */
      }
      if (attempt < maxAttempts && isTransientMongoNetworkError(err)) {
        await sleep(150 * attempt)
        continue
      }
      throw err
    }
  }

  throw lastErr
}

async function connectDB() {
  // Leer en connect time (no al import): scripts tsx cargan .env.local después.
  const MONGODB_URI = process.env.MONGODB_URI?.trim()
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
  }

  // readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn
  }

  if (cached.conn && cached.conn.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry(MONGODB_URI)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    cached.conn = null
    throw e
  }

  return cached.conn
}

export default connectDB
