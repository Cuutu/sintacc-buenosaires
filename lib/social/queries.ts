import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Venture } from "@/models/Venture"
import { Review } from "@/models/Review"
import { TYPES } from "@/lib/constants"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import {
  getCategoryLabel,
  getModalityLabels,
  getSafetyBadge as getVentureSafetyBadge,
} from "@/lib/venture-constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import type {
  SocialContentItem,
  SocialMilestoneData,
  SocialPreset,
  SocialQueryOptions,
} from "@/lib/social/types"

function getTypeMeta(type: string) {
  return TYPES.find((t) => t.value === type) ?? TYPES.find((t) => t.value === "other")!
}

function getPlaceExtraBadge(tags?: string[]): string | undefined {
  if (!tags?.length) return undefined
  if (tags.includes("cocina_separada")) return "Cocina separada"
  if (tags.includes("certificado_sin_tacc")) return "Certificado sin TACC"
  return undefined
}

function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function buildDateFilter(days?: number): { createdAt?: { $gte: Date } } {
  if (!days || days <= 0) return {}
  const since = new Date()
  since.setDate(since.getDate() - days)
  return { createdAt: { $gte: since } }
}

async function attachPlaceReviewStats(
  items: SocialContentItem[],
  placeDocs: Array<{ _id: { toString(): string } }>
): Promise<SocialContentItem[]> {
  if (placeDocs.length === 0) return items

  const ids = placeDocs.map((p) => p._id)
  const stats = await Review.aggregate([
    { $match: { placeId: { $in: ids }, status: "visible" } },
    {
      $group: {
        _id: "$placeId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ])

  const statsMap = new Map(
    stats.map((s) => [
      s._id.toString(),
      {
        avgRating: Math.round(s.avgRating * 10) / 10,
        totalReviews: s.totalReviews as number,
      },
    ])
  )

  return items.map((item) => {
    if (item.kind !== "place") return item
    const row = statsMap.get(item.id)
    if (!row || row.totalReviews < 3) return item
    return {
      ...item,
      ratingLine: `★${row.avgRating.toFixed(1)} (${row.totalReviews} reseñas)`,
    }
  })
}

function placeToItem(place: {
  _id: { toString(): string }
  slug?: string | null
  name: string
  type: string
  types?: string[]
  neighborhood: string
  tags?: string[]
  safetyLevel?: string
  photos?: string[]
  createdAt: Date
}): SocialContentItem {
  const typeValue = place.types?.[0] ?? place.type
  const typeMeta = getTypeMeta(typeValue)
  const safety = getSafetyBadge(inferSafetyLevel(place as Parameters<typeof inferSafetyLevel>[0]))
  const baseUrl = getBaseUrl()

  return {
    id: place._id.toString(),
    kind: "place",
    name: place.name,
    subtitle: place.neighborhood,
    typeLabel: typeMeta.label,
    typeEmoji: typeMeta.emoji,
    safetyLabel: safety.label,
    safetyDot: safety.dot,
    photoUrl: place.photos?.[0],
    celimapUrl: `${baseUrl}${getPlacePath(place)}`,
    extraBadge: getPlaceExtraBadge(place.tags),
    createdAt: place.createdAt.toISOString(),
  }
}

function ventureToItem(venture: {
  _id: { toString(): string }
  slug?: string | null
  name: string
  category: string
  zone: string
  modalities?: string[]
  safetyLevel?: string
  certifiedProducts?: boolean
  photos?: string[]
  createdAt: Date
}): SocialContentItem {
  const safety = getVentureSafetyBadge(venture.safetyLevel)
  const baseUrl = getBaseUrl()
  const slug = venture.slug ?? venture._id.toString()
  const modalities = venture.modalities?.length
    ? getModalityLabels(venture.modalities).slice(0, 2).join(" · ")
    : undefined

  return {
    id: venture._id.toString(),
    kind: "venture",
    name: venture.name,
    subtitle: venture.zone,
    typeLabel: getCategoryLabel(venture.category),
    typeEmoji: "🏪",
    safetyLabel: safety.label,
    safetyDot: safety.dot,
    photoUrl: venture.photos?.[0],
    celimapUrl: `${baseUrl}/emprendimientos/${slug}`,
    extraBadge: venture.certifiedProducts ? "Productos certificados" : undefined,
    modalitiesLine: modalities,
    createdAt: venture.createdAt.toISOString(),
  }
}

export function getPresetTitle(
  preset: SocialPreset,
  itemCount: number,
  neighborhood?: string
): string {
  switch (preset) {
    case "latest_places":
      return `${itemCount} lugares nuevos en Celimap`
    case "latest_ventures":
      return `${itemCount} emprendimientos nuevos en Celimap`
    case "neighborhood":
      return `${itemCount} lugares nuevos en ${neighborhood ?? "el barrio"}`
    case "dedicated_gf":
      return `${itemCount} lugares 100% sin TACC en Celimap`
    case "milestone":
      return "Hito comunidad Celimap"
    case "cta_suggest":
      return "¿Conocés un lugar o emprendimiento sin gluten?"
    default:
      return "Contenido Celimap"
  }
}

export async function fetchMilestoneData(): Promise<SocialMilestoneData> {
  await connectDB()
  const monthStart = startOfMonth()

  const [placesCount, reviewsCount, venturesCount, newPlacesThisMonth, newVenturesThisMonth] =
    await Promise.all([
      Place.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "visible" }),
      Venture.countDocuments({ status: "approved" }),
      Place.countDocuments({ status: "approved", createdAt: { $gte: monthStart } }),
      Venture.countDocuments({ status: "approved", createdAt: { $gte: monthStart } }),
    ])

  return {
    placesCount,
    reviewsCount,
    venturesCount,
    newPlacesThisMonth,
    newVenturesThisMonth,
  }
}

export async function fetchSocialItems(options: SocialQueryOptions): Promise<{
  items: SocialContentItem[]
  presetTitle: string
  milestone?: SocialMilestoneData
}> {
  const {
    preset,
    limit = 10,
    days = 30,
    communityOnly = true,
    neighborhood,
    excludeIds = [],
  } = options

  if (preset === "milestone") {
    const milestone = await fetchMilestoneData()
    return { items: [], presetTitle: getPresetTitle(preset, 0), milestone }
  }

  if (preset === "cta_suggest") {
    const milestone = await fetchMilestoneData()
    return { items: [], presetTitle: getPresetTitle(preset, 0), milestone }
  }

  await connectDB()

  const excludeSet = new Set(excludeIds)
  const dateFilter = buildDateFilter(days)

  if (preset === "latest_ventures") {
    const query: Record<string, unknown> = { status: "approved", ...dateFilter }
    if (communityOnly) query.source = "suggestion"

    const ventures = await Venture.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + excludeIds.length)
      .lean()

    const items = ventures
      .filter((v) => !excludeSet.has(v._id.toString()))
      .slice(0, limit)
      .map((v) => ventureToItem(v as Parameters<typeof ventureToItem>[0]))

    return { items, presetTitle: getPresetTitle(preset, items.length) }
  }

  const placeQuery: Record<string, unknown> = { status: "approved", ...dateFilter }

  if (communityOnly && preset !== "dedicated_gf") {
    placeQuery.source = "suggestion"
  }

  if (preset === "neighborhood") {
    if (!neighborhood?.trim()) throw new Error("Seleccioná un barrio")
    placeQuery.neighborhood = neighborhood.trim()
  }

  if (preset === "dedicated_gf") {
    placeQuery.$or = [
      { safetyLevel: "dedicated_gf" },
      { tags: { $in: ["100_gf", "certificado_sin_tacc"] } },
    ]
  }

  const places = await Place.find(placeQuery)
    .sort({ createdAt: -1 })
    .limit(limit + excludeIds.length)
    .lean()

  const filtered = places.filter((p) => !excludeSet.has(p._id.toString())).slice(0, limit)
  let items = filtered.map((p) => placeToItem(p as Parameters<typeof placeToItem>[0]))
  items = await attachPlaceReviewStats(items, filtered as Array<{ _id: { toString(): string } }>)

  return {
    items,
    presetTitle: getPresetTitle(
      preset,
      items.length,
      preset === "neighborhood" ? neighborhood : undefined
    ),
  }
}

export function getVenturesSuggestLink(baseUrl?: string): string {
  const base = baseUrl ?? getBaseUrl()
  return `${base}/sugerir-emprendimiento`
}

export function getPresetLink(preset: SocialPreset, baseUrl?: string): string {
  const base = baseUrl ?? getBaseUrl()
  switch (preset) {
    case "latest_ventures":
      return `${base}/emprendimientos`
    case "cta_suggest":
      return `${base}/sugerir`
    default:
      return `${base}/mapa`
  }
}
