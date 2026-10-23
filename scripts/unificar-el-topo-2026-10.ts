/**
 * Churros El Topo #SINTACC: unifica el duplicado de "Acassuso" con la ficha de CABA
 * (revisión 23/10).
 *
 * La ficha de Acassuso (Lavalle 1144, B1641) es la misma de Lavalle 1144 en CABA,
 * mal geocodificada: tiene el mismo lugar de Google. Y es la que está en Destacados,
 * así que en la home sale un pin en Acassuso.
 *
 * Qué hace (todo con condiciones: si algo ya no está como se espera, lo saltea):
 * 1. La ficha de CABA pasa a Destacados en el mismo puesto que tenía la de Acassuso.
 * 2. Reseñas, favoritos y listas de la de Acassuso pasan a la de CABA (sin duplicar
 *    favoritos de una misma persona ni lugares dentro de una lista).
 * 3. La de Acassuso se despublica (status "pending") y sale de Destacados. No se borra.
 *
 * Si ya corriste scripts/fix-ubicaciones-2026-10.ts --write, el paso 3 ya está hecho
 * y este script igual mueve Destacados, reseñas, favoritos y listas.
 *
 * Uso (desde la raíz del repo, lee .env.local):
 *   npx tsx scripts/unificar-el-topo-2026-10.ts            # dry-run, no escribe
 *   npx tsx scripts/unificar-el-topo-2026-10.ts --write    # aplica
 */
import { loadEnvFiles } from "./load-env"

const SCRIPT_TAG = "script:unificar-el-topo-2026-10"
const GOOGLE_PLACE_ID = "ChIJ84aESwDLvJURXzr2ekMWrO4"
const DROP = { id: "698d2f35e9980045731f4a84", slug: "churros-el-topo-sintacc-acassuso" }
const KEEP = { id: "6a7be35f3c2912d76e276560", slug: "churros-el-topo-sintacc-san-nicolas" }

type PlaceDoc = {
  _id: unknown
  name?: string
  slug?: string
  status?: string
  featured?: boolean
  featuredOrder?: number
  googlePlaceId?: string
  location?: { lat?: number; lng?: number }
}

function describe(doc: PlaceDoc | null): string {
  if (!doc) return "(no existe)"
  const featured = doc.featured ? `destacado #${doc.featuredOrder ?? "?"}` : "no destacado"
  return `${doc.name} | ${doc.status} | ${featured} | ${doc.location?.lat}, ${doc.location?.lng}`
}

function editLogPush(fields: string[]) {
  return { editLog: { $each: [{ at: new Date(), by: SCRIPT_TAG, fields }], $position: 0, $slice: 12 } }
}

async function main() {
  loadEnvFiles()
  if (!process.env.MONGODB_URI?.trim()) {
    console.error("Falta MONGODB_URI en .env.local")
    process.exit(1)
  }
  const write = process.argv.includes("--write")
  console.log(`unificar-el-topo-2026-10 | ${write ? "WRITE" : "DRY-RUN (no escribe)"}`)

  const mongoose = (await import("mongoose")).default
  const { default: connectDB } = await import("../lib/mongodb")
  await connectDB()
  const db = mongoose.connection
  const places = db.collection("places")
  const dropId = new mongoose.Types.ObjectId(DROP.id)
  const keepId = new mongoose.Types.ObjectId(KEEP.id)
  const projection = { name: 1, slug: 1, status: 1, featured: 1, featuredOrder: 1, googlePlaceId: 1, location: 1 }

  const drop = (await places.findOne({ _id: dropId }, { projection })) as PlaceDoc | null
  const keep = (await places.findOne({ _id: keepId }, { projection })) as PlaceDoc | null
  console.log(`\nAcassuso (se despublica): ${describe(drop)}`)
  console.log(`CABA (queda):             ${describe(keep)}`)

  // Las dos tienen que ser el mismo local de Google y la de CABA tiene que estar publicada.
  if (!drop || drop.slug !== DROP.slug || drop.googlePlaceId !== GOOGLE_PLACE_ID) {
    console.log("\nSALTEADO: la ficha de Acassuso no está como se esperaba.")
    await mongoose.disconnect()
    return
  }
  if (!keep || keep.slug !== KEEP.slug || keep.googlePlaceId !== GOOGLE_PLACE_ID || keep.status !== "approved") {
    console.log("\nSALTEADO: la ficha de CABA no está como se esperaba (tiene que estar publicada).")
    await mongoose.disconnect()
    return
  }

  const reviews = await db.collection("reviews").countDocuments({ placeId: dropId })
  const favorites = await db.collection("favorites").countDocuments({ placeId: dropId })
  const lists = await db.collection("lists").countDocuments({ placeIds: dropId })
  const moveFeatured = Boolean(drop.featured) && !keep.featured
  console.log("\nCambios:")
  console.log(`  1. Destacados: ${moveFeatured ? `la de CABA entra en el puesto #${drop.featuredOrder ?? "?"}` : "nada (Acassuso no está destacada o CABA ya lo está)"}`)
  console.log(`  2. Pasan a CABA: ${reviews} reseñas, ${favorites} favoritos, ${lists} listas`)
  console.log(`  3. Acassuso: ${drop.status === "approved" ? "se despublica" : "ya estaba despublicada"} y sale de Destacados`)

  if (!write) {
    console.log("\nDRY-RUN: 0 escrituras. Para aplicar: --write")
    await mongoose.disconnect()
    return
  }

  if (moveFeatured) {
    await places.updateOne(
      { _id: keepId, status: "approved", featured: { $ne: true } },
      {
        $set: { featured: true, featuredOrder: drop.featuredOrder ?? 0, updatedAt: new Date() },
        $push: editLogPush(["featured", "featuredOrder"]),
      } as never
    )
  }

  if (reviews > 0) {
    await db.collection("reviews").updateMany({ placeId: dropId }, { $set: { placeId: keepId } })
  }

  if (favorites > 0) {
    // Favoritos: índice único (userId, placeId). Si la persona ya tenía guardada la de
    // CABA, el de Acassuso sobra; si no, se pasa.
    const rows = await db.collection("favorites").find({ placeId: dropId }, { projection: { userId: 1 } }).toArray()
    for (const row of rows) {
      const already = await db.collection("favorites").findOne({ userId: row.userId, placeId: keepId }, { projection: { _id: 1 } })
      if (already) await db.collection("favorites").deleteOne({ _id: row._id })
      else await db.collection("favorites").updateOne({ _id: row._id }, { $set: { placeId: keepId } })
    }
  }

  if (lists > 0) {
    // Primero se suma la de CABA (sin repetir) y después se saca la de Acassuso.
    await db.collection("lists").updateMany({ placeIds: dropId }, { $addToSet: { placeIds: keepId } })
    await db.collection("lists").updateMany({ placeIds: dropId }, { $pull: { placeIds: dropId } } as never)
    await db.collection("lists").updateMany(
      { "placeNotes.placeId": dropId },
      { $set: { "placeNotes.$[n].placeId": keepId } },
      { arrayFilters: [{ "n.placeId": dropId }] }
    )
  }

  await places.updateOne(
    { _id: dropId, googlePlaceId: GOOGLE_PLACE_ID },
    {
      $set: { status: "pending", featured: false, updatedAt: new Date() },
      $push: editLogPush(["status", "featured"]),
    } as never
  )

  const after = {
    drop: (await places.findOne({ _id: dropId }, { projection })) as PlaceDoc | null,
    keep: (await places.findOne({ _id: keepId }, { projection })) as PlaceDoc | null,
  }
  console.log(`\nDespués:\n  Acassuso: ${describe(after.drop)}\n  CABA:     ${describe(after.keep)}`)
  console.log(
    "\nLa home y el mapa se actualizan solos en ~15 min y las fichas en ~1 h (caché). Guardar cualquier lugar desde /admin fuerza el refresco."
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
