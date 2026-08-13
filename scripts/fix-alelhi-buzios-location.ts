/**
 * Corrige pin de Alelhí (Búzios) que quedó en placeholder CABA / "Argentina".
 *
 *   npx tsx scripts/fix-alelhi-buzios-location.ts
 */
import { loadEnvFiles } from "./load-env"

loadEnvFiles()

const MAPS_URL = "https://maps.app.goo.gl/XayVD2Z5LncnWCV2A"
const FALLBACK = { lat: -22.7581446, lng: -41.8903548 }

async function main() {
  const { default: connectDB } = await import("../lib/mongodb")
  const { Place } = await import("../models/Place")
  const { findGooglePlaceFromMapsUrl } = await import("../lib/google-places-enriched")
  const { invalidateApiCache } = await import("../lib/api-cache")

  await connectDB()

  const place = await Place.findOne({
    slug: "alelhi-restaurante-mercado-buzios",
  })
  if (!place) {
    console.error("No encontré el lugar por slug")
    process.exit(1)
  }

  console.log("Antes:", {
    name: place.name,
    address: place.address,
    neighborhood: place.neighborhood,
    location: place.location,
  })

  const google = await findGooglePlaceFromMapsUrl(MAPS_URL)
  const lat = google?.lat ?? FALLBACK.lat
  const lng = google?.lng ?? FALLBACK.lng
  const address =
    google?.address && google.address.trim().toLowerCase() !== "argentina"
      ? google.address
      : "Armação dos Búzios, Rio de Janeiro, Brasil"

  place.location = { lat, lng }
  place.address = address
  if (google?.neighborhood) place.neighborhood = google.neighborhood
  else if (!place.neighborhood || place.neighborhood === "A completar") {
    place.neighborhood = "Búzios"
  }
  if (google?.placeId && !place.googlePlaceId) {
    place.googlePlaceId = google.placeId
  }
  place.locationPrecision = "exact"
  await place.save()

  try {
    invalidateApiCache(["public:places:", "admin:places:", "seo:province:"])
  } catch {
    /* cache tag no disponible fuera de Next */
  }

  console.log("Después:", {
    name: place.name,
    address: place.address,
    neighborhood: place.neighborhood,
    location: place.location,
    googlePlaceId: place.googlePlaceId,
    googleName: google?.name,
  })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
