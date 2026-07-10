import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"

async function backfillGooglePlaceIds() {
  await connectDB()
  console.log("Conectado a MongoDB")

  const places = await Place.find({
    $or: [{ googlePlaceId: { $exists: false } }, { googlePlaceId: null }, { googlePlaceId: "" }],
    "aiEnrichment.googlePlaceId": { $type: "string" },
  })
    .select("_id name aiEnrichment.googlePlaceId")
    .lean()

  let updated = 0
  for (const place of places) {
    const id = place.aiEnrichment?.googlePlaceId?.trim()
    if (!id) continue
    await Place.updateOne({ _id: place._id }, { $set: { googlePlaceId: id } })
    updated++
    console.log(`${place.name} -> ${id}`)
  }

  console.log(`Backfill terminado. Actualizados: ${updated}`)
}

backfillGooglePlaceIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en backfill googlePlaceId:", error)
    process.exit(1)
  })
