import { cache } from "react"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import {
  getCityBySlug,
  CATEGORY_SLUG_TO_TYPE,
  TYPE_TO_CATEGORY_SLUG,
  CATEGORIES,
  CITIES,
} from "./cities"
import { getProvinceBySlug } from "./provinces"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { canonicalCityPlaceFilter } from "./city-place-match"

const PER_PAGE = 24

/** ISR/build: si Atlas no responde, página vacía — no tumbar `next build`. */
async function connectSeoDb(): Promise<boolean> {
  try {
    await connectDB()
    return true
  } catch (error) {
    console.error("[seo] Mongo unavailable:", error)
    return false
  }
}

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

const EMPTY_PLACE_PAGE = { places: [] as PlaceSEO[], total: 0, pages: 0 }

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
async function loadPlacesByCity(
  citySlug: string,
  page = 1,
  barrio?: string
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const city = getCityBySlug(citySlug)
  if (!city) return { places: [], total: 0, pages: 0 }
  if (!(await connectSeoDb())) return EMPTY_PLACE_PAGE

  const query: any = {
    ...canonicalCityPlaceFilter(city),
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

/** Deduplica generateMetadata + page en el mismo request. */
export const getPlacesByCity = cache(loadPlacesByCity)

async function loadPlacesByCityAndCategory(
  citySlug: string,
  categorySlug: string,
  page = 1
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const city = getCityBySlug(citySlug)
  const type = CATEGORY_SLUG_TO_TYPE[categorySlug]
  if (!city || !type) return { places: [], total: 0, pages: 0 }
  if (!(await connectSeoDb())) return EMPTY_PLACE_PAGE

  const skip = (page - 1) * PER_PAGE

  const query: any = {
    ...canonicalCityPlaceFilter(city),
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

export const getPlacesByCityAndCategory = cache(loadPlacesByCityAndCategory)

export async function getPlacesByCategory(
  categorySlug: string,
  page = 1
): Promise<{ places: PlaceSEO[]; total: number; pages: number }> {
  const type = CATEGORY_SLUG_TO_TYPE[categorySlug]
  if (!type) return { places: [], total: 0, pages: 0 }
  if (!(await connectSeoDb())) return EMPTY_PLACE_PAGE

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
  if (!(await connectSeoDb())) return []

  const agg = await Place.aggregate([
    { $match: canonicalCityPlaceFilter(city) },
    { $group: { _id: "$neighborhood", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  return agg.map((r: { _id: string; count: number }) => ({ name: r._id, count: r.count }))
}

export async function getTopPlaces(citySlug: string, limit = 10): Promise<PlaceSEO[]> {
  const city = getCityBySlug(citySlug)
  if (!city) return []
  if (!(await connectSeoDb())) return []

  const places = await Place.find(canonicalCityPlaceFilter(city))
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
  if (!(await connectSeoDb())) return { places: [], total: 0 }

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
  if (!(await connectSeoDb())) return []

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
  if (!(await connectSeoDb())) return null
  const last = await Place.findOne({ status: "approved", province: provinceSlug })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
}

/** lastmod por scope: máximo updatedAt de los lugares de esa página */
export async function getPageLastModified(placeIds: string[]): Promise<Date | null> {
  if (placeIds.length === 0) return null
  if (!(await connectSeoDb())) return null
  const last = await Place.findOne({ _id: { $in: placeIds } })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
}

export async function getLastPlaceUpdated(): Promise<Date | null> {
  if (!(await connectSeoDb())) return null
  const last = await Place.findOne({ status: "approved" })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
  return last?.updatedAt ? new Date(last.updatedAt) : null
}

export type CityPageStats = {
  total: number
  dedicatedGf: number
  gfOptions: number
  categories: { slug: string; name: string; count: number }[]
  neighborhoods: { name: string; count: number }[]
  lastUpdated: Date | null
}

/**
 * Agregados reales por ciudad (province + locality).
 * Clasificación: tag 100_gf o safetyLevel dedicated_gf → dedicated;
 * opciones_sin_tacc o safetyLevel gf_options → opciones.
 * certificado_sin_tacc es materia prima, no cocina 100%.
 */
export async function getCityPageStats(citySlug: string): Promise<CityPageStats> {
  const empty: CityPageStats = {
    total: 0,
    dedicatedGf: 0,
    gfOptions: 0,
    categories: [],
    neighborhoods: [],
    lastUpdated: null,
  }
  const city = getCityBySlug(citySlug)
  if (!city) return empty
  if (!(await connectSeoDb())) return empty

  const match = canonicalCityPlaceFilter(city)

  const [total, dedicatedGf, gfOptions, typeAgg, neighborhoods, last] = await Promise.all([
    Place.countDocuments(match),
    Place.countDocuments({
      ...match,
      $or: [
        { tags: "100_gf" },
        { safetyLevel: "dedicated_gf" },
      ],
    }),
    Place.countDocuments({
      ...match,
      $and: [
        {
          $or: [{ tags: "opciones_sin_tacc" }, { safetyLevel: "gf_options" }],
        },
        {
          tags: { $nin: ["100_gf"] },
        },
        { safetyLevel: { $ne: "dedicated_gf" } },
      ],
    }),
    Place.aggregate([
      { $match: match },
      {
        $project: {
          type: {
            $cond: [
              { $and: [{ $isArray: "$types" }, { $gt: [{ $size: "$types" }, 0] }] },
              { $arrayElemAt: ["$types", 0] },
              "$type",
            ],
          },
        },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    getTopNeighborhoods(citySlug),
    Place.findOne(match).sort({ updatedAt: -1 }).select("updatedAt").lean(),
  ])

  const categories = typeAgg
    .map((row: { _id: string; count: number }) => {
      const slug = TYPE_TO_CATEGORY_SLUG[row._id]
      const cat = CATEGORIES.find((c) => c.slug === slug)
      if (!cat) return null
      return { slug: cat.slug, name: cat.name, count: row.count }
    })
    .filter(Boolean) as { slug: string; name: string; count: number }[]

  return {
    total,
    dedicatedGf,
    gfOptions,
    categories,
    neighborhoods,
    lastUpdated: last?.updatedAt ? new Date(last.updatedAt) : null,
  }
}

export type CityRecentReview = {
  rating: number
  comment?: string
  placeName: string
  placePath: string
  createdAt?: Date
}

export async function getRecentReviewsForCity(
  citySlug: string,
  limit = 5
): Promise<CityRecentReview[]> {
  const city = getCityBySlug(citySlug)
  if (!city) return []
  if (!(await connectSeoDb())) return []

  const places = await Place.find(canonicalCityPlaceFilter(city), {
    _id: 1,
    name: 1,
    slug: 1,
  }).lean()
  if (places.length === 0) return []

  const placeMap = new Map(
    places.map((p: { _id: { toString(): string }; name: string; slug?: string }) => [
      p._id.toString(),
      p,
    ])
  )
  const placeIds = places.map((p: { _id: unknown }) => p._id)

  const reviews = await Review.find({ placeId: { $in: placeIds }, status: "visible" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("rating comment placeId createdAt")
    .lean()

  const { getPlacePath } = await import("@/lib/place-url")

  return reviews
    .map((r: { rating: number; comment?: string; placeId: { toString(): string }; createdAt?: Date }) => {
      const place = placeMap.get(r.placeId.toString())
      if (!place) return null
      return {
        rating: r.rating,
        comment: r.comment,
        placeName: place.name,
        placePath: getPlacePath(place),
        createdAt: r.createdAt,
      }
    })
    .filter(Boolean) as CityRecentReview[]
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