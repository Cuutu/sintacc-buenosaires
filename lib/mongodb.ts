import dns from "node:dns"
import mongoose from "mongoose"
import { attachDatabasePool } from "@vercel/functions"

/**
 * Windows a veces deja Node con DNS 127.0.0.1 (Docker/VPN/AdGuard)
 * y querySrv a Atlas revienta con ECONNREFUSED. nslookup al router sí anda.
 * Solo dev: si el resolver es loopback muerto, usamos DNS público.
 */
function patchDeadLocalDns() {
  if (process.env.NODE_ENV === "production") return
  const servers = dns.getServers()
  const onlyLoopback =
    servers.length > 0 &&
    servers.every(
      (s) => s === "127.0.0.1" || s === "::1" || s.startsWith("127.0.0.1:") || s.startsWith("[::1]")
    )
  if (!onlyLoopback) return
  dns.setServers(["8.8.8.8", "1.1.1.1"])
}

function isSrvDnsFail(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /querySrv|ENOTFOUND.*mongodb/i.test(msg)
}

const MONGO_OPTS = {
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
  patchDeadLocalDns()
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
    cached.promise = mongoose.connect(MONGODB_URI, MONGO_OPTS).then((m) => {
      attachDatabasePool(m.connection.getClient())
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    cached.conn = null
    if (process.env.NODE_ENV !== "production" && isSrvDnsFail(e)) {
      dns.setServers(["8.8.8.8", "1.1.1.1"])
      cached.promise = mongoose.connect(MONGODB_URI, MONGO_OPTS).then((m) => {
        attachDatabasePool(m.connection.getClient())
        return m
      })
      try {
        cached.conn = await cached.promise
      } catch (retryError) {
        cached.promise = null
        cached.conn = null
        throw retryError
      }
    } else {
      throw e
    }
  }

  return cached.conn
}

export default connectDB
