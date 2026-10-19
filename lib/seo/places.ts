import { cache } from "react"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { getReviewStatsFor } from "@/lib/review-stats-index"
import {
  getCityBySlug,
  CATEGORY_SLUG_TO_TYPE,
  TYPE_TO_CATEGORY_SLUG,
  CATEGORIES,
  CITIES,
} from "./cities"
import { getProvinceBySlug } from "./provinces"
import { buildNationalCategoryMongoQuery } from "./argentina-place"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { canonicalCityPlaceFilter } from "./city-place-match"
import { escapeRegexLiteral } from "@/lib/chat/regex"

const PER_PAGE = 24

/**
 * Campos que usan normalizePlace e inferSafetyLevel. Antes las landings traían el
 * documento entero (aiEnrichment, editLog, googleSync…) para tirar casi todo.
 */
export const PLACE_SEO_PROJECTION = {
  slug: 1,
  name: 1,
  type: 1,
  types: 1,
  neighborhood: 1,
  province: 1,
  locality: 1,
  address: 1,
  photos: 1,
  tags: 1,
  safetyLevel: 1,
  updatedAt: 1,
  "contact.instagram": 1,
  "contact.url": 1,
} as const

/**
 * Cómo se muestra el estado de un lugar, en Mongo: lo mismo que inferSafetyLevel
 * (tags primero y `opciones_sin_tacc` gana sobre `100_gf`; `safetyLevel` solo si
 * los tags no dicen nada). Así los conteos de las landings coinciden con los badges.
 */
export const DISPLAY_DEDICATED_MATCH = {
  $or: [
    { $and: [{ tags: "100_gf" }, { tags: { $ne: "opciones_sin_tacc" } }] },
    { tags: { $nin: ["100_gf", "opciones_sin_tacc"] }, safetyLevel: "dedicated_gf" },
  ],
}

export const DISPLAY_OPTIONS_MATCH = {
  $or: [
    { tags: "opciones_sin_tacc" },
    { tags: { $nin: ["100_gf", "opciones_sin_tacc"] }, safetyLevel: "gf_options" },
  ],
}

function facetCount(rows: { n: number }[] | undefined): number {
  return rows?.[0]?.n ?? 0
}

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
  const statsMap = await getReviewStatsFor(places.map((p: any) => p._id))
  return places.map((p: any) => ({
    ...normalizePlace(p),
    stats: statsMap.get(p._id.toString()),
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
    if (matchedBarrio) {
      query.neighborhood = matchedBarrio
    } else if (barrio.length <= 80) {
      // Los links de barrio salen de la base (getCityPageStats), no del config de
      // la ciudad: antes "Los Boulevares" mostraba la lista sin filtrar. Si el
      // barrio no tiene ningún lugar (URL inventada), se ignora como antes.
      const byName = { ...query, neighborhood: { $regex: `^${escapeRegexLiteral(barrio.trim())}$`, $options: "i" } }
      if ((await Place.countDocuments(byName)) > 0) query.neighborhood = byName.neighborhood
    }
  }
  const skip = (page - 1) * PER_PAGE

  const [places, total] = await Promise.all([
    Place.find(query, PLACE_SEO_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
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
    Place.find(query, PLACE_SEO_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
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

  const query = buildNationalCategoryMongoQuery(type)

  const [places, total] = await Promise.all([
    Place.find(query, PLACE_SEO_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
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

  const places = await Place.find(canonicalCityPlaceFilter(city), PLACE_SEO_PROJECTION)
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
    Place.find(query, PLACE_SEO_PROJECTION).sort({ createdAt: -1 }).limit(limit).lean(),
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

  // Una sola ida a Atlas (antes eran 6 queries).
  const [row] = await Place.aggregate([
    { $match: canonicalCityPlaceFilter(city) },
    {
      $facet: {
        total: [{ $count: "n" }],
        dedicated: [{ $match: DISPLAY_DEDICATED_MATCH }, { $count: "n" }],
        options: [{ $match: DISPLAY_OPTIONS_MATCH }, { $count: "n" }],
        types: [
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
        ],
        neighborhoods: [
          { $group: { _id: "$neighborhood", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        last: [{ $sort: { updatedAt: -1 } }, { $limit: 1 }, { $project: { _id: 0, updatedAt: 1 } }],
      },
    },
  ])
  if (!row) return empty

  const categories = (row.types as { _id: string; count: number }[])
    .map((r) => {
      const slug = TYPE_TO_CATEGORY_SLUG[r._id]
      const cat = CATEGORIES.find((c) => c.slug === slug)
      if (!cat) return null
      return { slug: cat.slug, name: cat.name, count: r.count }
    })
    .filter(Boolean) as { slug: string; name: string; count: number }[]

  const lastUpdated = (row.last as { updatedAt?: Date }[])[0]?.updatedAt

  return {
    total: facetCount(row.total),
    dedicatedGf: facetCount(row.dedicated),
    gfOptions: facetCount(row.options),
    categories,
    neighborhoods: (row.neighborhoods as { _id: string; count: number }[]).map((r) => ({
      name: r._id,
      count: r.count,
    })),
    lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
  }
}

export type CityPlaceIndexEntry = { _id: { toString(): string }; name: string; slug?: string }

/**
 * Ids, nombre y slug de todos los lugares de la ciudad. Lo usan las reseñas
 * recientes y las listas relacionadas; con cache() es una sola query por render.
 */
async function loadCityPlaceIndex(citySlug: string): Promise<CityPlaceIndexEntry[]> {
  const city = getCityBySlug(citySlug)
  if (!city) return []
  if (!(await connectSeoDb())) return []
  return (await Place.find(canonicalCityPlaceFilter(city), { _id: 1, name: 1, slug: 1 }).lean()) as CityPlaceIndexEntry[]
}

export const getCityPlaceIndex = cache(loadCityPlaceIndex)

export type ProvinceSummary = { slug: string; total: number; localityCount: number }

/**
 * Total de lugares y cantidad de localidades por provincia, en una sola query
 * (el hub /sin-gluten-argentina hacía 5 queries por cada una de las 24).
 */
export async function getProvinceSummaries(provinceSlugs: string[]): Promise<ProvinceSummary[]> {
  if (provinceSlugs.length === 0) return []
  if (!(await connectSeoDb())) return provinceSlugs.map((slug) => ({ slug, total: 0, localityCount: 0 }))
  const rows: { _id: string; total: number; localities: (string | null)[] }[] = await Place.aggregate([
    { $match: { status: "approved", province: { $in: provinceSlugs } } },
    { $group: { _id: "$province", total: { $sum: 1 }, localities: { $addToSet: "$locality" } } },
  ])
  const bySlug = new Map(rows.map((r) => [r._id, r]))
  return provinceSlugs.map((slug) => {
    const r = bySlug.get(slug)
    return {
      slug,
      total: r?.total ?? 0,
      localityCount: r ? r.localities.filter(Boolean).length : 0,
    }
  })
}

export type ProvinceCounts = {
  dedicatedGf: number
  gfOptions: number
  /** Lugares por tipo (cuenta `type` y cada uno de `types`, sin repetir). */
  byType: Record<string, number>
}

/** Conteos de una provincia sobre todos sus lugares (antes salían de una muestra de 200). */
export async function getProvinceCounts(provinceSlug: string): Promise<ProvinceCounts> {
  const empty: ProvinceCounts = { dedicatedGf: 0, gfOptions: 0, byType: {} }
  if (!(await connectSeoDb())) return empty
  const [row] = await Place.aggregate([
    { $match: { status: "approved", province: provinceSlug } },
    {
      $facet: {
        dedicated: [{ $match: DISPLAY_DEDICATED_MATCH }, { $count: "n" }],
        options: [{ $match: DISPLAY_OPTIONS_MATCH }, { $count: "n" }],
        types: [
          { $project: { t: { $setUnion: [{ $ifNull: ["$types", []] }, [{ $ifNull: ["$type", null] }]] } } },
          { $unwind: "$t" },
          { $match: { t: { $ne: null } } },
          { $group: { _id: "$t", count: { $sum: 1 } } },
        ],
      },
    },
  ])
  if (!row) return empty
  return {
    dedicatedGf: facetCount(row.dedicated),
    gfOptions: facetCount(row.options),
    byType: Object.fromEntries((row.types as { _id: string; count: number }[]).map((r) => [r._id, r.count])),
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

  const places = await getCityPlaceIndex(citySlug)
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