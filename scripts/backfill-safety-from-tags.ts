/**
 * Alinea safetyLevel con tags (tags = fuente de verdad).
 *
 * Uso:
 *   MONGODB_URI="..." npx tsx scripts/backfill-safety-from-tags.ts
 *   MONGODB_URI="..." npx tsx scripts/backfill-safety-from-tags.ts --dry-run
 */
import dns from "dns"
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"

// Node en algunas redes Windows falla querySrv (ECONNREFUSED); DNS público arregla.
dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

type SafetyLevel = "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"

function safetyFromTags(tags: string[] = []): SafetyLevel | undefined {
  if (tags.includes("opciones_sin_tacc")) return "gf_options"
  if (tags.includes("100_gf")) return "dedicated_gf"
  return undefined
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  await connectDB()
  console.log(dryRun ? "DRY RUN — no escribe" : "BACKFILL — escribe DB")

  const places = await Place.find(
    {},
    { _id: 1, name: 1, neighborhood: 1, slug: 1, safetyLevel: 1, tags: 1, status: 1 }
  ).lean()

  let updated = 0
  let skipped = 0
  const changes: Array<{
    name: string
    slug?: string | null
    from: string | null
    to: SafetyLevel
  }> = []

  for (const place of places) {
    const fromTags = safetyFromTags(place.tags ?? [])
    if (!fromTags) {
      skipped += 1
      continue
    }
    const current = (place.safetyLevel as SafetyLevel | undefined) ?? null
    if (current === fromTags) {
      skipped += 1
      continue
    }

    changes.push({
      name: place.name,
      slug: place.slug,
      from: current,
      to: fromTags,
    })

    if (!dryRun) {
      await Place.updateOne({ _id: place._id }, { $set: { safetyLevel: fromTags } })
    }
    updated += 1
  }

  const byTransition = new Map<string, number>()
  for (const c of changes) {
    const key = `${c.from ?? "∅"} → ${c.to}`
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1)
  }

  console.log("\nTransiciones:")
  for (const [k, n] of [...byTransition.entries()].sort()) {
    console.log(`  ${k}: ${n}`)
  }

  console.log("\nDetalle:")
  for (const c of changes) {
    console.log(`  ${c.name} (${c.slug ?? "?"}): ${c.from ?? "∅"} → ${c.to}`)
  }

  console.log(`\nActualizados: ${updated}`)
  console.log(`Sin cambio / sin tag: ${skipped}`)
  console.log(`Total lugares: ${places.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error backfill safety from tags:", error)
    process.exit(1)
  })
