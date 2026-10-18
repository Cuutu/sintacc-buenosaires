/**
 * Corrección puntual de ubicaciones y duplicados (octubre 2026).
 *
 * - Bonnevill (Villa Devoto): el link de Maps se resolvió a "Sanitarios
 *   Bonneville" (Rawson 2117, a 13 km). Pin al lugar real y se borra el ID de
 *   Google del corralón para que la sincronización no traiga sus datos.
 * - Los 36 Billares (Monserrat): estaba en (0, 0). Pin a Av. de Mayo 1271.
 * - Churros El Topo "Acassuso": duplicado mal geocodificado del de Lavalle 1144
 *   (CABA), que ya existe bien cargado. Se despublica.
 * - Vanyla Cakes (La Lucila) y Selvático (Villa Urquiza): duplicados. Se
 *   despublica la ficha más vieja; queda la más nueva, que ya tiene el pin de
 *   Google.
 *
 * Despublicar = status "pending" (no se borra nada). Cada cambio exige que el
 * documento siga en el estado esperado; si no, se saltea sin escribir.
 *
 * Uso (desde la raíz del repo, lee .env.local):
 *   npx tsx scripts/fix-ubicaciones-2026-10.ts            # dry-run, no escribe
 *   npx tsx scripts/fix-ubicaciones-2026-10.ts --write    # aplica
 *
 * Correr --write DESPUÉS de deployar el arreglo del link de Maps
 * (fix/ubicaciones-maps-link): si no, la sincronización con Google puede volver
 * a encontrar el corralón para Bonnevill.
 */
import { loadEnvFiles } from "./load-env"

const SCRIPT_TAG = "script:fix-ubicaciones-2026-10"
const WRONG_BONNEVILL_GOOGLE_ID = "ChIJCwFQYkyxvJUR0MpN3zDBBa4" // Sanitarios Bonneville

type Fix = {
  id: string
  slug: string
  why: string
  /** Condiciones extra (además de _id + slug) que tienen que cumplirse para escribir. */
  expect: Record<string, unknown>
  set: Record<string, unknown>
  unset?: string[]
}

const FIXES: Fix[] = [
  {
    id: "6ad221b043b583f83c4e6a65",
    slug: "bonnevill-devoto",
    why: "pin del corralón Sanitarios Bonneville → Bonnevill en Tinogasta 3979 (link de Maps)",
    expect: {
      status: "approved",
      googlePlaceId: WRONG_BONNEVILL_GOOGLE_ID,
      "location.lat": { $gt: -34.49, $lt: -34.488 },
    },
    set: {
      location: { lat: -34.6057344, lng: -58.5046558 },
      locationPrecision: "exact",
    },
    unset: ["googlePlaceId", "googleSnapshot", "googleSync"],
  },
  {
    id: "6acbc80f4ead5d03564c7e17",
    slug: "los-36-billares-monserrat",
    why: "pin en (0, 0) → Av. de Mayo 1271 (lugar de Google ya asignado)",
    expect: { "location.lat": 0, "location.lng": 0 },
    set: {
      location: { lat: -34.6091049, lng: -58.3843784 },
      locationPrecision: "exact",
    },
  },
  {
    id: "698d2f35e9980045731f4a84",
    slug: "churros-el-topo-sintacc-acassuso",
    why: "duplicado de churros-el-topo-sintacc-san-nicolas (Lavalle 1144 es en CABA, no en Acassuso)",
    expect: { status: "approved", googlePlaceId: "ChIJ84aESwDLvJURXzr2ekMWrO4" },
    set: { status: "pending" },
  },
  {
    id: "698d098534e4c7bccba5fb58",
    slug: "vanyla-cakes-la-lucila",
    why: "duplicado de vanyla-cakes-pasteleria-sin-tacc-vte-lopez (mismo local de Google)",
    expect: { status: "approved", googlePlaceId: "ChIJh7BWDLuxvJURgsJOfbmw-po" },
    set: { status: "pending" },
  },
  {
    id: "698d2ecde9980045731f4a1c",
    slug: "selvatico-villa-urquiza",
    why: "duplicado de selvatico-villa-urquiza-2 (mismo local de Google)",
    expect: { status: "approved", googlePlaceId: "ChIJWTZeUgC3vJURmvzIftGKhJk" },
    set: { status: "pending" },
  },
]

function snapshot(doc: Record<string, unknown> | null) {
  if (!doc) return null
  const loc = doc.location as { lat?: number; lng?: number } | undefined
  return {
    name: doc.name,
    status: doc.status,
    coords: loc ? `${loc.lat}, ${loc.lng}` : "(sin)",
    googlePlaceId: doc.googlePlaceId ?? "(sin)",
  }
}

async function main() {
  loadEnvFiles()
  if (!process.env.MONGODB_URI?.trim()) {
    console.error("Falta MONGODB_URI en .env.local")
    process.exit(1)
  }

  const write = process.argv.includes("--write")
  console.log(`fix-ubicaciones-2026-10 | ${write ? "WRITE" : "DRY-RUN (no escribe)"}`)

  const mongoose = (await import("mongoose")).default
  const { default: connectDB } = await import("../lib/mongodb")
  await connectDB()
  const col = mongoose.connection.collection("places")
  const projection = { name: 1, slug: 1, status: 1, location: 1, googlePlaceId: 1 }

  let applied = 0
  let skipped = 0

  for (const fix of FIXES) {
    const _id = new mongoose.Types.ObjectId(fix.id)
    const filter = { _id, slug: fix.slug, ...fix.expect }
    console.log(`\n• ${fix.slug}\n  ${fix.why}`)

    const current = await col.findOne({ _id }, { projection })
    console.log("  antes:", JSON.stringify(snapshot(current as Record<string, unknown> | null)))
    if (!current) {
      console.log("  SALTEADO: no existe")
      skipped++
      continue
    }
    if (!(await col.findOne(filter, { projection: { _id: 1 } }))) {
      console.log("  SALTEADO: ya no está en el estado esperado (¿ya se corrigió?)")
      skipped++
      continue
    }

    const fields = [...Object.keys(fix.set), ...(fix.unset ?? [])]
    console.log("  cambia:", JSON.stringify({ set: fix.set, unset: fix.unset ?? [] }))
    if (!write) continue

    const update: Record<string, unknown> = {
      $set: { ...fix.set, updatedAt: new Date() },
      $push: {
        editLog: {
          $each: [{ at: new Date(), by: SCRIPT_TAG, fields }],
          $position: 0,
          $slice: 12,
        },
      },
    }
    if (fix.unset?.length) {
      update.$unset = Object.fromEntries(fix.unset.map((key) => [key, ""]))
    }

    const result = await col.updateOne(filter, update)
    if (result.modifiedCount !== 1) {
      console.error(`  ERROR: matched=${result.matchedCount} modified=${result.modifiedCount}`)
      process.exitCode = 1
      continue
    }

    // El ID equivocado también puede haber quedado en la investigación IA.
    if (fix.slug === "bonnevill-devoto") {
      await col.updateOne(
        { _id, "aiEnrichment.googlePlaceId": WRONG_BONNEVILL_GOOGLE_ID },
        { $unset: { "aiEnrichment.googlePlaceId": "" } }
      )
    }

    const after = await col.findOne({ _id }, { projection })
    console.log("  después:", JSON.stringify(snapshot(after as Record<string, unknown> | null)))
    applied++
  }

  console.log(
    `\n${write ? `Aplicados: ${applied}` : "DRY-RUN: 0 escrituras. Para aplicar: --write"} | salteados: ${skipped}`
  )
  if (write && applied > 0) {
    console.log(
      "El mapa se actualiza solo en ~15 min y las fichas en ~1 h (caché). Guardar cualquier lugar desde /admin fuerza el refresco del mapa."
    )
  }
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
