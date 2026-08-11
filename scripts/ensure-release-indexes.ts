#!/usr/bin/env tsx
/**
 * Release indexes for Etapas 2–3 (Apple auth + account deletion).
 *
 * Default: dry-run / catalog check. Never syncIndexes(), never drop.
 *
 *   npm run check:release-indexes
 *   npm run ensure:release-indexes -- --apply
 *
 * Prints host/db name only (no credentials). Does not print appleSub / tokens.
 */

import mongoose from "mongoose"

type IndexSpec = {
  collection: string
  keys: Record<string, 1 | -1>
  name: string
  unique?: boolean
  sparse?: boolean
  expireAfterSeconds?: number
  partialFilterExpression?: Record<string, unknown>
  reason: string
  /** Extra preflight when applying */
  preflight?: "appleSub" | "none"
}

/** Stable names — do not rename lightly (production may already have them). */
export const RELEASE_INDEXES: IndexSpec[] = [
  {
    collection: "users",
    keys: { appleSub: 1 },
    name: "appleSub_sparse_unique",
    unique: true,
    sparse: true,
    reason: "Sign in with Apple identity uniqueness",
    preflight: "appleSub",
  },
  {
    collection: "nativeapplechallenges",
    keys: { challengeId: 1 },
    name: "challengeId_1",
    unique: true,
    reason: "One-shot Apple nonce challenge lookup",
  },
  {
    collection: "nativeapplechallenges",
    keys: { expiresAt: 1 },
    name: "expiresAt_1",
    expireAfterSeconds: 0,
    reason: "TTL purge for Apple challenges",
  },
  {
    collection: "nativeapplegrants",
    keys: { code: 1 },
    name: "code_1",
    unique: true,
    reason: "Opaque NextAuth Apple grant one-shot",
  },
  {
    collection: "nativeapplegrants",
    keys: { expiresAt: 1 },
    name: "expiresAt_1",
    expireAfterSeconds: 0,
    reason: "TTL purge for Apple grants",
  },
  {
    collection: "nativegooglegrants",
    keys: { code: 1 },
    name: "code_1",
    unique: true,
    reason: "Opaque NextAuth Google grant one-shot",
  },
  {
    collection: "nativegooglegrants",
    keys: { expiresAt: 1 },
    name: "expiresAt_1",
    expireAfterSeconds: 0,
    reason: "TTL purge for Google grants",
  },
  {
    collection: "mobileauthhandoffs",
    keys: { code: 1 },
    name: "code_1",
    unique: true,
    reason: "Mobile OAuth handoff one-shot",
  },
  {
    collection: "mobileauthhandoffs",
    keys: { expiresAt: 1 },
    name: "expiresAt_1",
    expireAfterSeconds: 0,
    reason: "TTL purge for mobile handoffs",
  },
  {
    collection: "accountdeletionjobs",
    keys: { userId: 1 },
    name: "userId_1",
    unique: true,
    reason: "Idempotent / concurrent account deletion claim",
  },
  {
    collection: "accountdeletionjobs",
    keys: { status: 1 },
    name: "status_1",
    reason: "Filter pending Cloudinary cleanup jobs",
  },
  {
    collection: "accountdeletionjobs",
    keys: { nextAttemptAt: 1 },
    name: "nextAttemptAt_1",
    reason: "Retry scheduler for Cloudinary pending",
  },
  {
    collection: "accountdeletionjobs",
    keys: { completedAt: 1 },
    name: "completedAt_1",
    expireAfterSeconds: 60 * 60 * 24 * 7,
    partialFilterExpression: {
      status: { $in: ["completed", "completed_manual_apple_revoke"] },
    },
    reason: "TTL remove terminal deletion jobs after 7d",
  },
]

function redactUri(uri: string): { host: string; db: string } {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "https://"))
    const db = u.pathname.replace(/^\//, "").split("?")[0] || "(default)"
    return { host: u.hostname, db }
  } catch {
    return { host: "(unparsed)", db: "(unparsed)" }
  }
}

function indexMatches(
  existing: Record<string, unknown>,
  spec: IndexSpec
): boolean {
  if (existing.name !== spec.name) return false
  if (JSON.stringify(existing.key) !== JSON.stringify(spec.keys)) return false
  if (Boolean(existing.unique) !== Boolean(spec.unique)) return false
  if (Boolean(existing.sparse) !== Boolean(spec.sparse)) return false
  if (spec.expireAfterSeconds !== undefined) {
    if (existing.expireAfterSeconds !== spec.expireAfterSeconds) return false
  }
  if (spec.partialFilterExpression) {
    if (
      JSON.stringify(existing.partialFilterExpression) !==
      JSON.stringify(spec.partialFilterExpression)
    ) {
      return false
    }
  }
  return true
}

async function preflightAppleSub(
  coll: mongoose.mongo.Collection
): Promise<{ ok: boolean; message: string }> {
  const dupes = await coll
    .aggregate<{ count: number }>([
      { $match: { appleSub: { $type: "string", $ne: "" } } },
      { $group: { _id: "$appleSub", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "n" },
    ])
    .toArray()
  const dupeGroups = dupes[0]?.count ?? 0
  if (dupeGroups > 0) {
    return {
      ok: false,
      message: `appleSub duplicate groups=${dupeGroups} (values redacted)`,
    }
  }
  const emptyString = await coll.countDocuments({ appleSub: "" })
  if (emptyString > 0) {
    return {
      ok: false,
      message: `appleSub empty-string docs=${emptyString}`,
    }
  }
  return { ok: true, message: "appleSub preflight OK" }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const uri = process.env.MONGODB_URI?.trim()

  console.log("=== CeliMap release indexes ===")
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN / CHECK"}`)
  console.log(`Specs: ${RELEASE_INDEXES.length}\n`)

  for (const spec of RELEASE_INDEXES) {
    console.log(
      `- ${spec.collection}.${spec.name} keys=${JSON.stringify(spec.keys)} ` +
        `unique=${Boolean(spec.unique)} sparse=${Boolean(spec.sparse)} ` +
        `ttl=${spec.expireAfterSeconds ?? "-"} — ${spec.reason}`
    )
  }

  if (!uri) {
    console.log(
      "\nMONGODB_URI missing — catalog-only (no live compare). Set URI for dry-run against DB."
    )
    if (apply) {
      console.error("Refusing --apply without MONGODB_URI")
      process.exit(1)
    }
    process.exit(0)
  }

  const { host, db: dbName } = redactUri(uri)
  console.log(`\nTarget host=${host} db=${dbName}`)

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  if (!db) throw new Error("DB not connected")

  let missing = 0
  let mismatch = 0
  let ok = 0

  for (const spec of RELEASE_INDEXES) {
    const coll = db.collection(spec.collection)
    const indexes = await coll.indexes()
    const byName = indexes.find((i) => i.name === spec.name)
    const byKey = indexes.find(
      (i) => JSON.stringify(i.key) === JSON.stringify(spec.keys)
    )

    if (spec.preflight === "appleSub") {
      const pf = await preflightAppleSub(coll)
      console.log(`\n[${spec.collection}] ${pf.message}`)
      if (!pf.ok) {
        console.error("Preflight failed — refuse create")
        await mongoose.disconnect()
        process.exit(2)
      }
    }

    if (byName && indexMatches(byName as Record<string, unknown>, spec)) {
      console.log(`✅ ${spec.collection}.${spec.name} present`)
      ok += 1
      continue
    }

    if (byName && !indexMatches(byName as Record<string, unknown>, spec)) {
      console.error(
        `❌ ${spec.collection}.${spec.name} exists but options/key differ — manual review (no auto-drop)`
      )
      mismatch += 1
      continue
    }

    if (byKey && byKey.name !== spec.name) {
      console.error(
        `❌ ${spec.collection} has same keys under name=${byKey.name}, expected=${spec.name} — manual review`
      )
      mismatch += 1
      continue
    }

    console.log(`⚠️  MISSING ${spec.collection}.${spec.name}`)
    missing += 1

    if (apply) {
      const options: Record<string, unknown> = {
        name: spec.name,
        background: true,
      }
      if (spec.unique) options.unique = true
      if (spec.sparse) options.sparse = true
      if (spec.expireAfterSeconds !== undefined) {
        options.expireAfterSeconds = spec.expireAfterSeconds
      }
      if (spec.partialFilterExpression) {
        options.partialFilterExpression = spec.partialFilterExpression
      }
      console.log(`Creating ${spec.collection}.${spec.name}…`)
      await coll.createIndex(spec.keys, options)
      const after = await coll.indexes()
      const created = after.find((i) => i.name === spec.name)
      if (!created || !indexMatches(created as Record<string, unknown>, spec)) {
        console.error(`❌ Verify failed for ${spec.name}`)
        await mongoose.disconnect()
        process.exit(3)
      }
      console.log(`✅ Created ${spec.collection}.${spec.name}`)
      ok += 1
      missing -= 1
    }
  }

  console.log(
    `\nSummary: ok=${ok} missing=${missing} mismatch=${mismatch} mode=${apply ? "APPLY" : "DRY-RUN"}`
  )
  if (!apply && missing > 0) {
    console.log("To create missing indexes: npm run ensure:release-indexes -- --apply")
  }

  await mongoose.disconnect()
  process.exit(mismatch > 0 ? 3 : 0)
}

main().catch(async (err) => {
  console.error("release-indexes failed:", err instanceof Error ? err.name : "error")
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
