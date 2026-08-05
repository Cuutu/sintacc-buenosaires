import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import {
  getCityBySlug,
  CATEGORY_SLUG_TO_TYPE,
  CITIES,
} from "./cities"
import { getProvinceBySlug } from "./provinces"
import { inferSafetyLevel } from "@/components/featured/featured-utils"

const PER_PAGE = 24

export type PlaceSEO = {
  _id: string
  slug?: string | null
  name: string
  type: string
  types?: string[]
  neighborhood: string
  province?: string
  locality?: string
  address?: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: string
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
  updatedAt?: Date
  contact?: { instagram?: string; url?: string }
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

/**
 * Páginas de ciudad filtran por province + locality (NO por neighborhood),
 * porque barrios como "Centro" existen en múltiples ciudades.
 * El filtro ?barrio= se mantiene como refinamiento adicional sobre neighborhood.
 */
export async function getPlacesByCity(
  citySlug: string,
  page = 1,
  barrio?: string
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const city = getCityBySlug(citySlug)
  if (!city) return { places: [], total: 0, pages: 0 }

  await connectDB()
  const query: any = {
    status: "approved",
    province: city.provinceSlug,
    locality: city.slug,
  }
  if (barrio) {
    const matchedBarrio = city.neighborhoods.find((n) => n.toLowerCase() === barrio.toLowerCase())
    if (matchedBarrio) query.neighborhood = matchedBarrio
  }
  const skip = (page - 1) * PER_PAGE

  const [places, total] = await Promise.all([
    Place.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return { places: enriched, total, pages }
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
  const skip = (page - 1) * PER_PAGE

  const query: any = {
    status: "approved",
    province: city.provinceSlug,
    locality: city.slug,
    $or: [{ type }, { types: type }],
  }

  const [places, total] = await Promise.all([
    Place.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return { places: enriched, total, pages }
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
    Place.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  const pages = Math.ceil(total / PER_PAGE)
  return { places: enriched, total, pages }
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
  const agg = await Place.aggregate([
    { $match: { status: "approved", province: city.provinceSlug, locality: city.slug } },
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
  const places = await Place.find({
    status: "approved",
    province: city.provinceSlug,
    locality: city.slug,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))
  return enriched
}

const TYPES_DONDE_COMER = ["restaurant", "cafe", "bakery", "bar", "icecream"]
const TYPES_DONDE_COMPRAR = ["store"]
const TYPES_PRODUCTORES = ["other"]

/**
 * Lugares de una provincia por campo `province` normalizado.
 * `total` = countDocuments (todos los resultados); `places.length` = solo los renderizados.
 */
export async function getPlacesByProvinceSlug(
  provinceSlug: string,
  options?: { categorySlug?: string; limit?: number }
): Promise<{ places: PlaceSEO[]; total: number }> {
  const province = getProvinceBySlug(provinceSlug)
  if (!province) return { places: [], total: 0 }

  await connectDB()
  const type = options?.categorySlug ? CATEGORY_SLUG_TO_TYPE[options.categorySlug] : undefined
  const query: any = { status: "approved", province: provinceSlug }
  if (type) query.$or = [{ type }, { types: type }]

  const limit = options?.limit ?? 200
  const [places, total] = await Promise.all([
    Place.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Place.countDocuments(query),
  ])

  const enriched = await enrichPlacesWithStats(places as any[])
  enriched.sort((a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0))

  // Dedupe por _id
  const seen = new Set<string>()
  const unique = enriched.filter((p) => {
    if (seen.has(p._id)) return false
    seen.add(p._id)
    return true
  })

  return { places: unique, total }
}

/** Agrupa localidades de una provincia con conteo y citySlug cuando existe página de ciudad */
export async function getProvinceLocalities(provinceSlug: string): Promise<{ name: string; slug: string; count: number; citySlug?: string }[]> {
  const province = getProvinceBySlug(provinceSlug)
  if (!province) return []

  await connectDB()
  const agg = await Place.aggregate([
    { $match: { status: "approved", province: provinceSlug } },
    { $group: { _id: "$locality", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  return agg
    .filter((r: { _id: string | null }) => Boolean(r._id))
    .map((r: { _id: string; count: number }) => {
      const city = CITIES.find((c) => c.slug === r._id)
      return {
        name: city?.name ?? r._id,
        slug: r._id,
        count: r.count,
        ...(city ? { citySlug: city.slug } : {}),
      }
    })
}

export async function getProvinceLastUpdated(provinceSlug: string): Promise<Date | null> {
  await connectDB()
  const last = await Place.findOne({ status: "approved", province: provinceSlug })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
}

/** lastmod por scope: máximo updatedAt de los lugares de esa página */
export async function getPageLastModified(placeIds: string[]): Promise<Date | null> {
  if (placeIds.length === 0) return null
  await connectDB()
  const last = await Place.findOne({ _id: { $in: placeIds } })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
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
    slug: p.slug,
    name: p.name,
    type: p.type,
    types: p.types,
    neighborhood: p.neighborhood,
    province: p.province,
    locality: p.locality,
    address: p.address,
    photos: p.photos,
    tags: p.tags,
    safetyLevel: inferSafetyLevel(p) ?? p.safetyLevel,
    updatedAt: p.updatedAt,
    contact: p.contact ? { instagram: p.contact.instagram, url: p.contact.url } : undefined,
  }
}