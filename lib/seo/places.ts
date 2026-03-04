import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import {
  getCityBySlug,
  CATEGORY_SLUG_TO_TYPE,
  CITIES,
} from "./cities"
import { inferSafetyLevel } from "@/components/featured/featured-utils"

const PER_PAGE = 24

export type PlaceSEO = {
  _id: string
  name: string
  type: string
  types?: string[]
  neighborhood: string
  address?: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: string
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
  updatedAt?: Date
}

async function enrichPlacesWithStats(places: any[]): Promise<PlaceSEO[]> {
  const placeIds = places.map((p: any) => p._id)
  const [reviewStats, contaminationCounts] = await Promise.all([
    Review.aggregate([
      { $match: { placeId: { $in: placeIds }, status: "visible" } },
      { $group: { _id: "$placeId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    ContaminationReport.aggregate([
      { $match: { placeId: { $in: placeIds }, status: "visible" } },
      { $group: { _id: "$placeId", count: { $sum: 1 } } },
    ]),
  ])
  const statsMap = new Map<string, { avgRating: number; totalReviews: number; contaminationReportsCount: number }>()
  placeIds.forEach((id: any) => {
    statsMap.set(id.toString(), { avgRating: 0, totalReviews: 0, contaminationReportsCount: 0 })
  })
  reviewStats.forEach((s: any) => {
    const entry = statsMap.get(s._id.toString())!
    entry.avgRating = Math.round(s.avgRating * 10) / 10
    entry.totalReviews = s.count
  })
  contaminationCounts.forEach((c: any) => {
    const entry = statsMap.get(c._id.toString())
    if (entry) entry.contaminationReportsCount = c.count
  })
  return places.map((p: any) => ({
    ...normalizePlace(p),
    stats: statsMap.get(p._id.toString()) ?? { avgRating: 0, totalReviews: 0, contaminationReportsCount: 0 },
  }))
}

export async function getPlacesByCity(
  citySlug: string,
  page = 1,
  barrio?: string
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const city = getCityBySlug(citySlug)
  if (!city) return { places: [], total: 0, pages: 0 }

  await connectDB()
  const matchedBarrio = barrio
    ? city.neighborhoods.find((n) => n.toLowerCase() === barrio.toLowerCase())
    : null
  const neighborhoods = matchedBarrio ? [matchedBarrio] : city.neighborhoods
  const skip = (page - 1) * PER_PAGE

  const [places, total] = await Promise.all([
    Place.find({
      status: "approved",
      neighborhood: { $in: neighborhoods },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PER_PAGE)
      .lean(),
    Place.countDocuments({
      status: "approved",
      neighborhood: { $in: neighborhoods },
    }),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return {
    places: enriched,
    total,
    pages,
  }
}

export async function getPlacesByCityAndCategory(
  citySlug: string,
  categorySlug: string,
  page = 1
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const city = getCityBySlug(citySlug)
  const type = CATEGORY_SLUG_TO_TYPE[categorySlug]
  if (!city || !type) return { places: [], total: 0, pages: 0 }

  await connectDB()
  const neighborhoods = city.neighborhoods
  const skip = (page - 1) * PER_PAGE

  const query: any = {
    status: "approved",
    neighborhood: { $in: neighborhoods },
    $or: [{ type }, { types: type }],
  }

  const [places, total] = await Promise.all([
    Place.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PER_PAGE)
      .lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return {
    places: enriched,
    total,
    pages,
  }
}

export async function getPlacesByCategory(
  categorySlug: string,
  page = 1
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const type = CATEGORY_SLUG_TO_TYPE[categorySlug]
  if (!type) return { places: [], total: 0, pages: 0 }

  await connectDB()
  const skip = (page - 1) * PER_PAGE

  const query: any = {
    status: "approved",
    $or: [{ type }, { types: type }],
  }

  const [places, total] = await Promise.all([
    Place.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PER_PAGE)
      .lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return {
    places: enriched,
    total,
    pages,
  }
}

export async function getPlacesByCategoryAndCity(
  categorySlug: string,
  citySlug: string,
  page = 1
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  return getPlacesByCityAndCategory(citySlug, categorySlug, page)
}

export async function getTopNeighborhoods(citySlug: string): Promise<{ name: string; count: number }[]> {
  const city = getCityBySlug(citySlug)
  if (!city) return []

  await connectDB()
  const neighborhoods = city.neighborhoods

  const agg = await Place.aggregate([
    { $match: { status: "approved", neighborhood: { $in: neighborhoods } } },
    { $group: { _id: "$neighborhood", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  return agg.map((r: { _id: string; count: number }) => ({ name: r._id, count: r.count }))
}

export async function getTopPlaces(citySlug: string, limit = 10): Promise<PlaceSEO[]> {
  const city = getCityBySlug(citySlug)
  if (!city) return []

  await connectDB()
  const neighborhoods = city.neighborhoods

  const places = await Place.find({
    status: "approved",
    neighborhood: { $in: neighborhoods },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  return enriched
}

export async function getLastPlaceUpdated(): Promise<Date | null> {
  await connectDB()
  const last = await Place.findOne({ status: "approved" })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
}

function normalizePlace(p: any): PlaceSEO {
  return {
    _id: p._id?.toString?.() ?? String(p._id),
    name: p.name,
    type: p.type,
    types: p.types,
    neighborhood: p.neighborhood,
    address: p.address,
    photos: p.photos,
    tags: p.tags,
    safetyLevel: inferSafetyLevel(p) ?? p.safetyLevel,
    updatedAt: p.updatedAt,
  }
}
