import connectDB from "@/lib/mongodb"
import { Place, type GooglePlaceSnapshot } from "@/models/Place"
import {
  fetchGooglePlaceEnriched,
  findGooglePlaceFromMapsUrl,
  searchGooglePlaceByText,
} from "@/lib/google-places-enriched"
import { getGoogleMapsApiKey } from "@/lib/google-places"
import { filterGlutenRelevantGoogleReviews } from "@/lib/google-reviews-filter"
import { isGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"
import { invalidateApiCache } from "@/lib/api-cache"

export const GOOGLE_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function isGoogleSnapshotStale(syncedAt?: Date | string | null): boolean {
  if (!syncedAt) return true
  const t = new Date(syncedAt).getTime()
  if (!Number.isFinite(t)) return true
  return Date.now() - t > GOOGLE_SNAPSHOT_TTL_MS
}

export function placeNeedsGoogleSync(place: {
  googleSync?: { status?: string } | null
  googleSnapshot?: { syncedAt?: Date | string | null } | null
}): boolean {
  const status = place.googleSync?.status
  if (status === "queued" || status === "running") return false
  if (status === "failed") return true
  if (!place.googleSnapshot?.syncedAt) return true
  return isGoogleSnapshotStale(place.googleSnapshot.syncedAt)
}

async function resolveGooglePlaceId(place: {
  name: string
  address?: string
  neighborhood?: string
  location?: { lat?: number; lng?: number }
  googlePlaceId?: string | null
  aiEnrichment?: { googlePlaceId?: string | null } | null
  contact?: { url?: string | null } | null
}): Promise<string | null> {
  if (place.googlePlaceId?.trim()) return place.googlePlaceId.trim()
  if (place.aiEnrichment?.googlePlaceId?.trim()) {
    return place.aiEnrichment.googlePlaceId.trim()
  }

  const url = place.contact?.url?.trim()
  if (url && isGoogleMapsUrl(url)) {
    const enriched = await findGooglePlaceFromMapsUrl(url)
    if (enriched?.placeId) return enriched.placeId
  }

  const query = [place.name, place.address, place.neighborhood]
    .map((p) => String(p ?? "").trim())
    .filter((p) => p && !p.toLowerCase().includes("a completar"))
    .join(" ")

  if (!query) return null

  const hit = await searchGooglePlaceByText(query, {
    lat: place.location?.lat,
    lng: place.location?.lng,
    radius: 800,
  })
  return hit?.placeId ?? null
}

export async function syncPlaceGoogleReviews(placeId: string): Promise<{
  ok: boolean
  error?: string
}> {
  await connectDB()

  if (!getGoogleMapsApiKey()) {
    return { ok: false, error: "GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY no configurada" }
  }

  const place = await Place.findById(placeId)
  if (!place) return { ok: false, error: "Lugar no encontrado" }

  try {
    const googlePlaceId = await resolveGooglePlaceId(place)
    if (!googlePlaceId) {
      await Place.updateOne(
        { _id: placeId },
        {
          $set: {
            googleSync: {
              status: "failed",
              ranAt: new Date(),
              startedAt: place.googleSync?.startedAt,
              error: "No se encontró lugar en Google Places",
            },
          },
        }
      )
      return { ok: false, error: "No se encontró lugar en Google Places" }
    }

    const enriched = await fetchGooglePlaceEnriched(googlePlaceId)
    if (!enriched) {
      await Place.updateOne(
        { _id: placeId },
        {
          $set: {
            googlePlaceId,
            googleSync: {
              status: "failed",
              ranAt: new Date(),
              startedAt: place.googleSync?.startedAt,
              error: "Places API no devolvió datos",
            },
          },
        }
      )
      return { ok: false, error: "Places API no devolvió datos" }
    }

    const reviews = enriched.reviews.slice(0, 5)
    const { glutenRelevant, glutenSignalSummary } =
      await filterGlutenRelevantGoogleReviews({
        placeName: place.name,
        reviews,
      })

    const snapshot: GooglePlaceSnapshot = {
      rating: enriched.rating,
      userRatingCount: enriched.userRatingCount,
      reviewSummaryText: enriched.reviewSummaryText,
      googleMapsUri: enriched.googleMapsUri,
      reviews,
      glutenRelevant,
      glutenSignalSummary,
      syncedAt: new Date(),
    }

    await Place.updateOne(
      { _id: placeId },
      {
        $set: {
          googlePlaceId,
          googleSnapshot: snapshot,
          googleSync: {
            status: "done",
            ranAt: new Date(),
            startedAt: place.googleSync?.startedAt,
          },
        },
      }
    )

    invalidateApiCache(["public:places:"])

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al sync Google"
    await Place.updateOne(
      { _id: placeId },
      {
        $set: {
          googleSync: {
            status: "failed",
            ranAt: new Date(),
            startedAt: place.googleSync?.startedAt,
            error: message,
          },
        },
      }
    )
    return { ok: false, error: message }
  }
}
