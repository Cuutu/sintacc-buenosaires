import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { PlaceRouteDoc } from "@/lib/place-route"
import { logSlowServerOp } from "@/lib/logger"

export type NearbyPlaceCard = {
  _id: string
  slug?: string | null
  name: string
  type: string
  types?: string[]
  photos?: string[]
  distance?: number
  /** Para la etiqueta 100% sin TACC / Con opciones de la tarjeta. */
  tags?: string[]
  safetyLevel?: string
}

const NEARBY_RADIUS_METERS = 2000
const NEARBY_DEGREE_PAD = 0.025

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toCard(
  doc: {
    _id: { toString(): string }
    slug?: string | null
    name: string
    type: string
    types?: string[]
    photos?: string[]
    distance?: number
    tags?: string[]
    safetyLevel?: string
  },
  excludeId: string
): NearbyPlaceCard | null {
  const id = doc._id.toString()
  if (id === excludeId) return null
  return {
    _id: id,
    slug: doc.slug,
    name: doc.name,
    type: doc.type,
    types: doc.types,
    photos: doc.photos,
    distance: typeof doc.distance === "number" ? doc.distance : undefined,
    tags: doc.tags,
    safetyLevel: doc.safetyLevel,
  }
}

export async function getNearbyPlacesForPlace(
  place: Pick<PlaceRouteDoc, "_id" | "location" | "neighborhood">
): Promise<NearbyPlaceCard[]> {
  const started = Date.now()
  await connectDB()
  const excludeId = place._id.toString()
  const lat = place.location?.lat
  const lng = place.location?.lng
  const done = (cards: NearbyPlaceCard[]) => {
    logSlowServerOp({
      route: "/lugar/[id]",
      op: "getNearbyPlacesForPlace",
      durationMs: Date.now() - started,
    })
    return cards
  }

  // (0, 0) es "sin pin": no sirve para medir distancias.
  const hasOrigin =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const origin = hasOrigin ? { lat: lat as number, lng: lng as number } : null

  if (origin) {
    const nearby = await Place.find({
      status: "approved",
      _id: { $ne: new mongoose.Types.ObjectId(excludeId) },
      "location.lat": { $gte: origin.lat - NEARBY_DEGREE_PAD, $lte: origin.lat + NEARBY_DEGREE_PAD },
      "location.lng": { $gte: origin.lng - NEARBY_DEGREE_PAD, $lte: origin.lng + NEARBY_DEGREE_PAD },
    })
      .select("slug name type types photos location tags safetyLevel")
      .lean()

    const ranked = nearby
      .map((doc) => {
        const card = toCard(doc, excludeId)
        const docLat = doc.location?.lat
        const docLng = doc.location?.lng
        if (!card || typeof docLat !== "number" || typeof docLng !== "number") return null
        const distance = haversineMeters(origin, { lat: docLat, lng: docLng })
        if (distance > NEARBY_RADIUS_METERS) return null
        return { ...card, distance }
      })
      .filter((row): row is NearbyPlaceCard & { distance: number } => row != null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    if (ranked.length > 0) return done(ranked)
  }

  if (!place.neighborhood) return done([])

  const list = await Place.find({
    status: "approved",
    neighborhood: place.neighborhood,
    _id: { $ne: new mongoose.Types.ObjectId(excludeId) },
  })
    .select("slug name type types photos location tags safetyLevel")
    .limit(5)
    .lean()

  // Mismo barrio: la distancia también, si los dos tienen pin (revisión 23/10).
  return done(
    list
      .map((doc) => {
        const card = toCard(doc as Parameters<typeof toCard>[0], excludeId)
        if (!card) return null
        const docLat = doc.location?.lat
        const docLng = doc.location?.lng
        if (origin && typeof docLat === "number" && typeof docLng === "number" && !(docLat === 0 && docLng === 0)) {
          return { ...card, distance: haversineMeters(origin, { lat: docLat, lng: docLng }) }
        }
        return card
      })
      .filter((row): row is NearbyPlaceCard => row != null)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  )
}
