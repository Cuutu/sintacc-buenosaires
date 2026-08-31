import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { PlaceRouteDoc } from "@/lib/place-route"

export type NearbyPlaceCard = {
  _id: string
  slug?: string | null
  name: string
  type: string
  types?: string[]
  photos?: string[]
  distance?: number
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
  }
}

export async function getNearbyPlacesForPlace(
  place: Pick<PlaceRouteDoc, "_id" | "location" | "neighborhood">
): Promise<NearbyPlaceCard[]> {
  await connectDB()
  const excludeId = place._id.toString()
  const lat = place.location?.lat
  const lng = place.location?.lng

  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const geo = await Place.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance",
            maxDistance: 2000,
            spherical: true,
            query: { status: "approved" },
          },
        },
        { $limit: 8 },
        {
          $project: {
            slug: 1,
            name: 1,
            type: 1,
            types: 1,
            photos: 1,
            distance: 1,
          },
        },
      ])
      const cards = geo
        .map((doc) => toCard(doc, excludeId))
        .filter((row): row is NearbyPlaceCard => row != null)
        .slice(0, 5)
      if (cards.length > 0) return cards
    } catch {
      // índice geo ausente → barrio
    }
  }

  if (!place.neighborhood) return []

  const list = await Place.find({
    status: "approved",
    neighborhood: place.neighborhood,
    _id: { $ne: new mongoose.Types.ObjectId(excludeId) },
  })
    .select("slug name type types photos")
    .limit(5)
    .lean()

  return list
    .map((doc) => toCard(doc as { _id: { toString(): string }; slug?: string | null; name: string; type: string; types?: string[]; photos?: string[] }, excludeId))
    .filter((row): row is NearbyPlaceCard => row != null)
}
