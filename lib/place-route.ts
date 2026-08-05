import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"

export interface PlaceRouteDoc {
  _id: { toString(): string }
  slug?: string | null
  name: string
  neighborhood: string
  type: string
  province?: string
  locality?: string
  address?: string
  location?: { lat: number; lng: number }
  photos?: string[]
  contact?: { url?: string; phone?: string; instagram?: string }
  openingHours?: string
  stats?: { avgRating?: number; totalReviews?: number }
}

export async function getApprovedPlaceByRouteParam(
  routeParam: string
): Promise<PlaceRouteDoc | null> {
  if (!routeParam) return null

  await connectDB()

  if (!mongoose.Types.ObjectId.isValid(routeParam)) {
    const bySlug = await Place.findOne({ slug: routeParam, status: "approved" }).lean()
    return bySlug as PlaceRouteDoc | null
  }

  const byId = await Place.findOne({
    _id: new mongoose.Types.ObjectId(routeParam),
    status: "approved",
  }).lean()

  return byId as PlaceRouteDoc | null
}