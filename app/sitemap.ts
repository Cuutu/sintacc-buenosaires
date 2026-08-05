import type { MetadataRoute } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { List } from "@/models/List"
import { getLastPlaceUpdated } from "@/lib/seo/places"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { buildSeoPages, dedupeUrls, type SitemapPlace } from "@/lib/seo/sitemap-pages"
import {
  VENTURE_CATEGORY_LANDINGS,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"
import { getAllApprovedVentureSlugs, countApprovedVentures } from "@/lib/ventures-server"

export const revalidate = 86400 // 24 horas

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
    { url: `${base}/mapa-sin-tacc`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.92 },
    { url: `${base}/mapa-celiaco`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.92 },
    { url: `${base}/explorar`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/sugerir`, lastModified: lastModDate, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sin-gluten-argentina`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/que-es-celimap`, lastModified: lastModDate, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/privacidad`, lastModified: lastModDate, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/listas`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/emprendimientos`, lastModified: lastModDate, changeFrequency: "weekly", priority: 0.8 },
  ]

  let seoPages: MetadataRoute.Sitemap = []

  let placeUrls: MetadataRoute.Sitemap = []
  let listUrls: MetadataRoute.Sitemap = []
  let ventureUrls: MetadataRoute.Sitemap = []

  try {
    await connectDB()

    const places = await Place.find(
      { status: "approved" },
      { _id: 1, slug: 1, type: 1, types: 1, neighborhood: 1, province: 1, locality: 1, updatedAt: 1 }
    ).lean()
    seoPages = dedupeUrls(buildSeoPages(base, places as SitemapPlace[]))
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

  return dedupeUrls([...staticPages, ...seoPages, ...placeUrls, ...listUrls, ...ventureUrls])
}