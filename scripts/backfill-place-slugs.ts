import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"
import { generateUniquePlaceSlug } from "../lib/place-slugs"

async function backfillPlaceSlugs() {
  await connectDB()
  console.log("Conectado a MongoDB")

  const places = await Place.find({}, { _id: 1, name: 1, neighborhood: 1, slug: 1 })
    .sort({ createdAt: 1, _id: 1 })
    .lean()

  let updated = 0
  let skipped = 0
  let fixedDuplicates = 0
  const seenSlugs = new Set<string>()

  for (const place of places) {
    const hasDuplicateSlug = Boolean(place.slug && seenSlugs.has(place.slug))
    if (place.slug && !hasDuplicateSlug) {
      seenSlugs.add(place.slug)
      skipped += 1
      continue
    }

    const slug = await generateUniquePlaceSlug(
      place.name,
      place.neighborhood,
      place._id
    )

    await Place.updateOne({ _id: place._id }, { $set: { slug } })
    seenSlugs.add(slug)
    updated += 1
    if (hasDuplicateSlug) fixedDuplicates += 1
    console.log(`${place.name} (${place.neighborhood}) -> ${slug}`)
  }

  console.log("Backfill terminado")
  console.log(`Actualizados: ${updated}`)
  console.log(`Omitidos: ${skipped}`)
  console.log(`Duplicados corregidos: ${fixedDuplicates}`)
}

backfillPlaceSlugs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en backfill de slugs:", error)
    process.exit(1)
  })

