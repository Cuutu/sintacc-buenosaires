import { cache } from "react"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { GooglePlaceSnapshot, IPlace } from "@/models/Place"
import { PUBLIC_PLACE_PAGE_SELECT } from "@/lib/places-public-select"

export interface PlaceRouteDoc {
  _id: { toString(): string }
  slug?: string | null
  name: string
  neighborhood: string
  type: string
  types?: string[]
  tags?: string[]
  safetyLevel?: IPlace["safetyLevel"]
  province?: string
  locality?: string
  address?: string
  addressText?: string
  location?: { lat: number; lng: number }
  photos?: string[]
  photoSource?: "community" | "google"
  contact?: { url?: string; phone?: string; instagram?: string }
  openingHours?: string
  googleSnapshot?: GooglePlaceSnapshot | null
  stats?: { avgRating?: number; totalReviews?: number }
}

async function loadApprovedPlaceByRouteParam(
  routeParam: string
): Promise<PlaceRouteDoc | null> {
  if (!routeParam) return null

  await connectDB()

  if (!mongoose.Types.ObjectId.isValid(routeParam)) {
    const bySlug = await Place.findOne({ slug: routeParam, status: "approved" })
      .select(PUBLIC_PLACE_PAGE_SELECT)
      .lean()
    return bySlug as PlaceRouteDoc | null
  }

  const byId = await Place.findOne({
    _id: new mongoose.Types.ObjectId(routeParam),
    status: "approved",
  })
    .select(PUBLIC_PLACE_PAGE_SELECT)
    .lean()
  if (byId) return byId as PlaceRouteDoc

  const bySlug = await Place.findOne({ slug: routeParam, status: "approved" })
    .select(PUBLIC_PLACE_PAGE_SELECT)
    .lean()
  return bySlug as PlaceRouteDoc | null
}

/** Deduplica layout + generateMetadata + page en el mismo request. */
export const getApprovedPlaceByRouteParam = cache(loadApprovedPlaceByRouteParam)
