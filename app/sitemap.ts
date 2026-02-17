import type { MetadataRoute } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"

function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL?.trim()
  if (url) return url.replace(/\/$/, "")
  return "https://sintacc-map.vercel.app"
}

export const revalidate = 86400 // 24 horas

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/mapa`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/sugerir`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ]

  try {
    await connectDB()
    const places = await Place.find(
      { status: "approved" },
      { _id: 1, updatedAt: 1 }
    ).lean()

    const placeUrls: MetadataRoute.Sitemap = places.map((p: any) => ({
      url: `${base}/lugar/${p._id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

    return [...staticPages, ...placeUrls]
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/sitemap", error)
    return staticPages
  }
}
