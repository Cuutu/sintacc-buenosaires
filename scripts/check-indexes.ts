#!/usr/bin/env tsx
/**
 * Checklist de índices MongoDB. Ejecutar con: npx tsx scripts/check-indexes.ts
 * Requiere MONGODB_URI en env.
 */
import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI no configurada")
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db
  if (!db) throw new Error("DB not connected")

  const expectedIndices: Record<string, Array<{ keys: Record<string, number | string>; options?: any }>> = {
    places: [
      { keys: { location: "2dsphere" } },
      { keys: { name: "text", address: "text", neighborhood: "text" } },
      { keys: { status: 1, type: 1 } },
      { keys: { neighborhood: 1, type: 1 } },
    ],
    reviews: [
      { keys: { placeId: 1, status: 1 } },
      { keys: { placeId: 1, createdAt: -1 } },
      { keys: { userId: 1, createdAt: -1 } },
    ],
    ratelimits: [
      { keys: { userId: 1, type: 1, date: 1 }, options: { unique: true } },
      { keys: { date: 1 }, options: { expireAfterSeconds: 86400 * 8 } },
    ],
    ratelimitips: [
      { keys: { ip: 1, type: 1, windowStart: 1 }, options: { unique: true } },
      { keys: { windowStart: 1 }, options: { expireAfterSeconds: 86400 * 8 } },
    ],
  }

  console.log("📋 Checklist de índices MongoDB\n")

  for (const [collName, expected] of Object.entries(expectedIndices)) {
    const coll = db.collection(collName)
    const indexes = await coll.indexes()

    console.log(`\n📦 ${collName}:`)
    for (const exp of expected) {
      const found = indexes.some((idx) => {
        const keyMatch = JSON.stringify(idx.key) === JSON.stringify(exp.keys)
        return keyMatch
      })
      console.log(
        found ? "  ✅" : "  ❌",
        JSON.stringify(exp.keys),
        exp.options ? `(${JSON.stringify(exp.options)})` : ""
      )
    }
  }

  console.log("\n✅ Checklist completado")
  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
