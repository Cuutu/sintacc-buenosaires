import type { MetadataRoute } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"
import { getLastPlaceUpdated } from "@/lib/seo/places"

function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL?.trim()
  if (url) return url.replace(/\/$/, "")
  return "https://sintacc-map.vercel.app"
}

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
    { url: `${base}/explorar`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/sugerir`, lastModified: lastModDate, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sin-gluten-argentina`, lastModified: lastModDate, changeFrequency: "daily", priority: 0.9 },
  ]

  const seoPages: MetadataRoute.Sitemap = []

  for (const city of CITIES) {
    seoPages.push({
      url: `${base}/sin-gluten/${city.slug}`,
      lastModified: lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })
    for (const cat of CATEGORIES) {
      seoPages.push({
        url: `${base}/sin-gluten/${city.slug}/${cat.slug}`,
        lastModified: lastModDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    }
  }

  for (const cat of CATEGORIES) {
    seoPages.push({
      url: `${base}/${cat.slug}-sin-gluten`,
      lastModified: lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })
    for (const city of CITIES) {
      seoPages.push({
        url: `${base}/${cat.slug}-sin-gluten/${city.slug}`,
        lastModified: lastModDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    }
  }

  for (const city of CITIES) {
    seoPages.push({
      url: `${base}/top-sin-gluten-${city.slug}`,
      lastModified: lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  }

  try {
    await connectDB()
    const places = await Place.find(
      { status: "approved" },
      { _id: 1, updatedAt: 1 }
    ).lean()

    const placeUrls: MetadataRoute.Sitemap = places.map((p: any) => ({
      url: `${base}/lugar/${p._id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : lastModDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

    return [...staticPages, ...seoPages, ...placeUrls]
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/sitemap", error)
    return [...staticPages, ...seoPages]
  }
}
