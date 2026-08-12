/**
 * Corrección geográfica puntual: Haala Gluten Free (Maschwitz mal etiquetado como La Plata).
 *
 * Dry-run por defecto. Escritura solo con --apply.
 * Rollback con --rollback (también exige --apply para escribir).
 *
 * Uso:
 *   npx tsx scripts/fix-haala-maschwitz-locality.ts
 *   npx tsx scripts/fix-haala-maschwitz-locality.ts --apply
 *   npx tsx scripts/fix-haala-maschwitz-locality.ts --rollback
 *   npx tsx scripts/fix-haala-maschwitz-locality.ts --rollback --apply
 *
 * Solo toca locality, neighborhood, updatedAt del documento que coincida
 * exactamente con el filtro precondición. No toca address/coords/reviews/etc.
 */

import { loadEnvFiles } from "./load-env"

const PLACE_ID = "69aa251158ac835acbeadb34"
const PLACE_SLUG = "haala-gluten-free"

/** Estado incorrecto actual (precondición para apply). */
const BEFORE = {
  province: "buenos-aires",
  locality: "la-plata",
  neighborhood: "La Plata",
  updatedAt: "2026-07-11T02:12:47.922Z",
} as const

/**
 * locality canónica ya usada en DB + KNOWN_LOCALITIES (correct-place-geography).
 * neighborhood canónico entre peers Maschwitz (no vacío: schema required).
 */
const AFTER = {
  province: "buenos-aires",
  locality: "ingeniero-maschwitz",
  neighborhood: "Ingeniero Maschwitz",
} as const

function modeFromArgv(argv: string[]) {
  const apply = argv.includes("--apply")
  const rollback = argv.includes("--rollback")
  return {
    apply,
    rollback,
    write: apply, // dry-run si falta --apply
  }
}

function publicSnapshot(doc: Record<string, unknown> | null) {
  if (!doc) return null
  const loc = doc.location as { lat?: number; lng?: number } | undefined
  return {
    _id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    status: doc.status,
    province: doc.province,
    locality: doc.locality,
    neighborhood: doc.neighborhood,
    address_summary: String(doc.address || "").slice(0, 90),
    coords:
      loc?.lat != null && loc?.lng != null ? `${loc.lat},${loc.lng}` : "(none)",
    updatedAt: doc.updatedAt,
  }
}

async function main() {
  loadEnvFiles()
  if (!process.env.MONGODB_URI?.trim()) {
    console.error("Falta MONGODB_URI en .env.local")
    process.exit(1)
  }

  const { apply, rollback, write } = modeFromArgv(process.argv.slice(2))
  console.log("fix-haala-maschwitz-locality")
  console.log(`mode: ${rollback ? "rollback" : "fix"} | ${write ? "WRITE" : "DRY-RUN"}`)
  console.log(`canonical_locality_slug: ${AFTER.locality}`)
  console.log(`canonical_neighborhood: ${AFTER.neighborhood}`)

  const mongoose = (await import("mongoose")).default
  const { default: connectDB } = await import("../lib/mongodb")
  await connectDB()
  const col = mongoose.connection.collection("places")
  const objectId = new mongoose.Types.ObjectId(PLACE_ID)

  const filter = rollback
    ? {
        _id: objectId,
        slug: PLACE_SLUG,
        province: AFTER.province,
        locality: AFTER.locality,
        neighborhood: AFTER.neighborhood,
      }
    : {
        _id: objectId,
        slug: PLACE_SLUG,
        province: BEFORE.province,
        locality: BEFORE.locality,
      }

  const set = rollback
    ? {
        locality: BEFORE.locality,
        neighborhood: BEFORE.neighborhood,
        updatedAt: new Date(BEFORE.updatedAt),
      }
    : {
        locality: AFTER.locality,
        neighborhood: AFTER.neighborhood,
        updatedAt: new Date(),
      }

  const current = await col.findOne(
    { _id: objectId },
    {
      projection: {
        _id: 1,
        slug: 1,
        name: 1,
        status: 1,
        address: 1,
        province: 1,
        locality: 1,
        neighborhood: 1,
        location: 1,
        updatedAt: 1,
      },
    }
  )

  console.log("--- before (live) ---")
  console.log(JSON.stringify(publicSnapshot(current as Record<string, unknown> | null), null, 2))

  if (!current) {
    console.error("ABORT: documento no encontrado. Sin escritura.")
    process.exit(1)
  }

  const matched = await col.findOne(filter, {
    projection: { _id: 1, slug: 1, province: 1, locality: 1, neighborhood: 1 },
  })

  if (!matched) {
    console.error("ABORT: precondición no coincide exactamente. Sin escritura.")
    console.error(`expected_filter: ${JSON.stringify({
      ...filter,
      _id: PLACE_ID,
    })}`)
    console.error(
      `actual: ${JSON.stringify({
        slug: current.slug,
        province: current.province,
        locality: current.locality,
        neighborhood: current.neighborhood,
      })}`
    )
    process.exit(1)
  }

  console.log("--- planned $set ---")
  console.log(
    JSON.stringify(
      {
        locality: set.locality,
        neighborhood: set.neighborhood,
        updatedAt: set.updatedAt instanceof Date ? set.updatedAt.toISOString() : set.updatedAt,
      },
      null,
      2
    )
  )
  console.log("--- untouched (garantizado por $set acotado) ---")
  console.log("address, location/coords, classification, reviews, photos, tags, status, slug, province")

  if (!write) {
    console.log("---")
    console.log("DRY-RUN: 0 writes. Para aplicar: --apply")
    process.exit(0)
  }

  const result = await col.updateOne(filter, { $set: set })
  if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
    console.error(
      `ABORT post-check: matched=${result.matchedCount} modified=${result.modifiedCount}`
    )
    process.exit(1)
  }

  const after = await col.findOne(
    { _id: objectId },
    {
      projection: {
        _id: 1,
        slug: 1,
        name: 1,
        status: 1,
        address: 1,
        province: 1,
        locality: 1,
        neighborhood: 1,
        location: 1,
        updatedAt: 1,
      },
    }
  )
  console.log("--- after (live) ---")
  console.log(JSON.stringify(publicSnapshot(after as Record<string, unknown> | null), null, 2))
  console.log("done")
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
