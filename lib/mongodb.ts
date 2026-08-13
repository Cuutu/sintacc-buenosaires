import mongoose from "mongoose"
import { attachDatabasePool } from "@vercel/functions"

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
  // Leer en connect time (no al import): scripts tsx cargan .env.local después.
  const MONGODB_URI = process.env.MONGODB_URI?.trim()
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
  }

  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn
  }

  if (cached.conn && cached.conn.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    // 1 socket por lambda. Sin retry/disconnect: eso disparaba picos en Atlas.
    const opts = {
      bufferCommands: false,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 1),
      minPoolSize: 0,
      maxIdleTimeMS: 10_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 12_000,
      connectTimeoutMS: 5_000,
      family: 4 as const,
      autoSelectFamily: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      // Evita sockets zombie cuando Vercel congela la lambda.
      attachDatabasePool(m.connection.getClient())
      return m
    })
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
