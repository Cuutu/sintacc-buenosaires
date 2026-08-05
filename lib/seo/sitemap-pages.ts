import type { MetadataRoute } from "next"
import { CITIES, CATEGORIES, CATEGORY_SLUG_TO_TYPE } from "./cities"
import { PROVINCES } from "./provinces"
import { isProvincePageIndexable, isProvinceCategoryIndexable } from "./indexing-rules"

export interface SitemapPlace {
  _id: { toString(): string }
  slug?: string
  type?: string
  types?: string[]
  neighborhood?: string
  province?: string
  locality?: string
  updatedAt?: Date
}

function maxUpdatedAt(places: SitemapPlace[]): Date | null {
  let max: Date | null = null
  for (const p of places) {
    if (p.updatedAt) {
      const d = new Date(p.updatedAt)
      if (!max || d > max) max = d
    }
  }
  return max
}

function placeHasType(place: SitemapPlace, type: string | undefined): boolean {
  if (!type) return false
  return place.type === type || Boolean(place.types?.includes(type))
}

export function buildSeoPages(base: string, places: SitemapPlace[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = []

  // Agrupar por provincia
  const placesByProvince = new Map<string, SitemapPlace[]>()
  for (const p of places) {
    if (p.province) {
      const arr = placesByProvince.get(p.province) ?? []
      arr.push(p)
      placesByProvince.set(p.province, arr)
    }
  }

  // Provincias (solo indexables)
  for (const province of PROVINCES) {
    const provincePlaces = placesByProvince.get(province.slug) ?? []
    const distinctLocalities = new Set(provincePlaces.map((p) => p.locality).filter(Boolean)).size
    if (isProvincePageIndexable(provincePlaces.length, distinctLocalities)) {
      pages.push({
        url: `${base}/sin-gluten/provincia/${province.slug}`,
        lastModified: maxUpdatedAt(provincePlaces) ?? undefined,
        changeFrequency: "weekly",
        priority: 0.84,
      })
      // Categorías provinciales indexables
      for (const cat of CATEGORIES) {
        const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
        const catPlaces = provincePlaces.filter((p) => placeHasType(p, type))
        if (isProvinceCategoryIndexable(catPlaces.length)) {
          pages.push({
            url: `${base}/sin-gluten/provincia/${province.slug}/${cat.slug}`,
            lastModified: maxUpdatedAt(catPlaces) ?? undefined,
            changeFrequency: "weekly",
            priority: 0.8,
          })
        }
      }
    }
  }

  // Ciudades (por province + locality normalizados)
  for (const city of CITIES) {
    const cityPlaces = places.filter(
      (p) => p.province === city.provinceSlug && p.locality === city.slug
    )
    if (cityPlaces.length > 0) {
      pages.push({
        url: `${base}/sin-gluten/${city.slug}`,
        lastModified: maxUpdatedAt(cityPlaces) ?? undefined,
        changeFrequency: "weekly",
        priority: 0.85,
      })
      pages.push({
        url: `${base}/top-sin-gluten-${city.slug}`,
        lastModified: maxUpdatedAt(cityPlaces) ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
    for (const cat of CATEGORIES) {
      const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
      const catPlaces = cityPlaces.filter((p) => placeHasType(p, type))
      if (catPlaces.length > 0) {
        pages.push({
          url: `${base}/sin-gluten/${city.slug}/${cat.slug}`,
          lastModified: maxUpdatedAt(catPlaces) ?? undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
    }
  }

  // Categorías nacionales
  for (const cat of CATEGORIES) {
    const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
    const catPlaces = places.filter((p) => placeHasType(p, type))
    if (catPlaces.length > 0) {
      pages.push({
        url: `${base}/${cat.slug}-sin-gluten`,
        lastModified: maxUpdatedAt(catPlaces) ?? undefined,
        changeFrequency: "weekly",
        priority: 0.85,
      })
    }
  }

  return pages
}

/** Dedupe por URL canónica */
export function dedupeUrls(pages: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>()
  const result: MetadataRoute.Sitemap = []
  for (const page of pages) {
    if (seen.has(page.url)) continue
    seen.add(page.url)
    result.push(page)
  }
  return result
}