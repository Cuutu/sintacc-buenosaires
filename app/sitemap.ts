import type { MetadataRoute } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { List } from "@/models/List"
import { CITIES, CATEGORIES, CATEGORY_SLUG_TO_TYPE } from "@/lib/seo/cities"
import { PROVINCES } from "@/lib/seo/provinces"
import { getLastPlaceUpdated } from "@/lib/seo/places"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import {
  VENTURE_CATEGORY_LANDINGS,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"
import { getAllApprovedVentureSlugs, countApprovedVentures } from "@/lib/ventures-server"

export const revalidate = 86400 // 24 horas

interface SitemapPlace {
  _id: { toString(): string }
  slug?: string
  type?: string
  types?: string[]
  neighborhood?: string
  updatedAt?: Date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()
  let lastModDate = new Date()
  try {
    const lastMod = await getLastPlaceUpdated()
    if (lastMod) lastModDate = lastMod
  } catch {
    // Sin DB usamos fecha actual
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: lastModDate, changeFrequency: "daily", priority: 1 },
    { url: `${base}/mapa`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/explorar`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/sugerir`, lastModified: lastModDate, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sin-gluten-argentina`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/listas`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/emprendimientos`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.8 },
  ]

  let seoPages = buildSeoPages(base, lastModDate)

  let placeUrls: MetadataRoute.Sitemap = []
  let listUrls: MetadataRoute.Sitemap = []
  let ventureUrls: MetadataRoute.Sitemap = []

  try {
    await connectDB()

    const places = await Place.find(
      { status: "approved" },
      { _id: 1, slug: 1, type: 1, types: 1, neighborhood: 1, updatedAt: 1 }
    ).lean()
    seoPages = buildSeoPages(base, lastModDate, places as SitemapPlace[])
    placeUrls = (places as SitemapPlace[]).map((p) => ({
      url: `${base}${getPlacePath(p)}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

    try {
      const lists = await List.find({ isPublic: true }, { _id: 1, updatedAt: 1 }).lean()
      listUrls = lists.map((l: { _id: unknown; updatedAt?: Date }) => ({
        url: `${base}/listas/${l._id}`,
        lastModified: l.updatedAt ? new Date(l.updatedAt) : lastModDate,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))
    } catch {
      // Listas opcionales
    }

    const ventureSlugs = await getAllApprovedVentureSlugs()
    ventureUrls = ventureSlugs.map((v) => ({
      url: `${base}/emprendimientos/${v.slug}`,
      lastModified: v.updatedAt ? new Date(v.updatedAt) : lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }))

    for (const cat of VENTURE_CATEGORY_LANDINGS) {
      const count = await countApprovedVentures({ category: cat.categoryId })
      if (count > 0) {
        ventureUrls.push({
          url: `${base}/emprendimientos/${cat.slug}`,
          lastModified: lastModDate,
          changeFrequency: "weekly" as const,
          priority: 0.78,
        })
      }
    }

    for (const zone of VENTURE_ZONE_LANDINGS) {
      const count = await countApprovedVentures({ zoneConfig: zone })
      if (count > 0) {
        ventureUrls.push({
          url: `${base}/emprendimientos/${zone.slug}`,
          lastModified: lastModDate,
          changeFrequency: "weekly" as const,
          priority: 0.77,
        })
      }
    }
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/sitemap", error)
  }

  return [...staticPages, ...seoPages, ...placeUrls, ...listUrls, ...ventureUrls]
}

function buildSeoPages(
  base: string,
  lastModDate: Date,
  places?: SitemapPlace[]
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = []
  const shouldIncludeAll = !places

  for (const province of PROVINCES) {
    if (
      shouldIncludeAll ||
      Boolean(places?.some((place) => province.citySlugs.some((citySlug) => isPlaceInCity(place, citySlug))))
    ) {
      pages.push({
        url: `${base}/sin-gluten/${province.slug}`,
        lastModified: lastModDate,
        changeFrequency: "weekly",
        priority: 0.84,
      })
    }
  }

  for (const city of CITIES) {
    const cityPlaces = shouldIncludeAll
      ? []
      : places.filter((place) => isPlaceInCity(place, city.slug))
    const hasCityPlaces = shouldIncludeAll || cityPlaces.length > 0

    if (hasCityPlaces) {
      pages.push({
        url: `${base}/sin-gluten/${city.slug}`,
        lastModified: lastModDate,
        changeFrequency: "weekly",
        priority: 0.85,
      })
      pages.push({
        url: `${base}/top-sin-gluten-${city.slug}`,
        lastModified: lastModDate,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }

    for (const cat of CATEGORIES) {
      const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
      const hasCategoryPlaces =
        shouldIncludeAll || cityPlaces.some((place) => placeHasType(place, type))
      if (hasCategoryPlaces) {
        pages.push({
          url: `${base}/sin-gluten/${city.slug}/${cat.slug}`,
          lastModified: lastModDate,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
    }
  }

  for (const cat of CATEGORIES) {
    const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
    const hasCategoryPlaces =
      shouldIncludeAll || Boolean(places?.some((place) => placeHasType(place, type)))
    if (hasCategoryPlaces) {
      pages.push({
        url: `${base}/${cat.slug}-sin-gluten`,
        lastModified: lastModDate,
        changeFrequency: "weekly",
        priority: 0.85,
      })
    }
  }

  return pages
}

function isPlaceInCity(place: SitemapPlace, citySlug: string): boolean {
  const city = CITIES.find((item) => item.slug === citySlug)
  return Boolean(place.neighborhood && city?.neighborhoods.includes(place.neighborhood))
}

function placeHasType(place: SitemapPlace, type: string | undefined): boolean {
  if (!type) return false
  return place.type === type || Boolean(place.types?.includes(type))
}
