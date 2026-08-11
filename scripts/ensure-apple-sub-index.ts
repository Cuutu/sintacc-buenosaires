#!/usr/bin/env tsx
/**
 * Dry-run / controlled creation of users.appleSub sparse unique index.
 *
 * Production note:
 * - Mongoose schema declares the index, but Vercel/serverless must NOT be trusted
 *   to auto-create it (autoIndex often off / raced / never awaited).
 * - This script NEVER runs syncIndexes() and NEVER drops indexes.
 *
 * Usage:
 *   npx tsx scripts/ensure-apple-sub-index.ts           # dry-run (default)
 *   npx tsx scripts/ensure-apple-sub-index.ts --apply # create if missing + safe
 *
 * Requires MONGODB_URI. Does not modify other indexes.
 */

import mongoose from "mongoose"

const INDEX_NAME = "appleSub_sparse_unique"
const COLLECTION = "users"

async function main() {
  const apply = process.argv.includes("--apply")
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI required")
    process.exit(1)
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  if (!db) throw new Error("DB not connected")
  const coll = db.collection(COLLECTION)

  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`)
  console.log(`Collection: ${COLLECTION}`)
  console.log(`Index name: ${INDEX_NAME}\n`)

  // 1) Duplicate / invalid appleSub values that would block unique index creation.
  const dupes = await coll
    .aggregate<{ _id: string; count: number; ids: unknown[] }>([
      { $match: { appleSub: { $type: "string", $ne: "" } } },
      {
        $group: {
          _id: "$appleSub",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()

  if (dupes.length) {
    console.error("❌ Duplicate appleSub values found — refuse index create:")
    for (const d of dupes) {
      console.error(`  appleSub=${d._id} count=${d.count} ids=${d.ids.join(",")}`)
    }
    await mongoose.disconnect()
    process.exit(2)
  }
  console.log("✅ No duplicate non-empty appleSub values")

  const emptyString = await coll.countDocuments({ appleSub: "" })
  if (emptyString > 0) {
    console.error(
      `❌ Found ${emptyString} documents with appleSub="" — clear or unset before unique sparse index`
    )
    await mongoose.disconnect()
    process.exit(2)
  }
  console.log("✅ No empty-string appleSub values")

  const withApple = await coll.countDocuments({
    appleSub: { $type: "string", $ne: "" },
  })
  console.log(`Users with appleSub set: ${withApple}`)

  // 2) Existing indexes
  const indexes = await coll.indexes()
  const existing = indexes.find((idx) => idx.name === INDEX_NAME)
  if (existing) {
    console.log("\n✅ Index already present:")
    console.log(JSON.stringify(existing, null, 2))
    const ok =
      existing.unique === true &&
      existing.sparse === true &&
      JSON.stringify(existing.key) === JSON.stringify({ appleSub: 1 })
    if (!ok) {
      console.error(
        "❌ Index name exists but options/key differ — manual review required (no auto-drop)"
      )
      await mongoose.disconnect()
      process.exit(3)
    }
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log("\n⚠️  Index missing.")
  console.log("Would create:")
  console.log(
    JSON.stringify(
      {
        key: { appleSub: 1 },
        name: INDEX_NAME,
        unique: true,
        sparse: true,
        background: true,
      },
      null,
      2
    )
  )

  if (!apply) {
    console.log("\nDry-run only. To create (after reviewing output):")
    console.log("  npx tsx scripts/ensure-apple-sub-index.ts --apply")
    console.log("\nOr mongosh:")
    console.log(
      `  db.users.createIndex({ appleSub: 1 }, { name: "${INDEX_NAME}", unique: true, sparse: true, background: true })`
    )
    console.log("\nVerify:")
    console.log(`  db.users.getIndexes().find(i => i.name === "${INDEX_NAME}")`)
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log("\nCreating index…")
  await coll.createIndex(
    { appleSub: 1 },
    {
      name: INDEX_NAME,
      unique: true,
      sparse: true,
      background: true,
    }
  )
  const after = await coll.indexes()
  const created = after.find((idx) => idx.name === INDEX_NAME)
  console.log("✅ Created:")
  console.log(JSON.stringify(created, null, 2))
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
