import type { MetadataRoute } from "next"
import { CITIES, CATEGORIES, CATEGORY_SLUG_TO_TYPE } from "./cities"
import { PROVINCES } from "./provinces"
import { placeMatchesCanonicalCity } from "./city-place-match"
import {
  isProvincePageIndexable,
  isProvinceCategoryIndexable,
  isCityPageIndexable,
  isCityCategoryIndexable,
} from "./indexing-rules"

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

  const placesByProvince = new Map<string, SitemapPlace[]>()
  for (const p of places) {
    if (p.province) {
      const arr = placesByProvince.get(p.province) ?? []
      arr.push(p)
      placesByProvince.set(p.province, arr)
    }
  }

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

  for (const city of CITIES) {
    const cityPlaces = places.filter((p) => placeMatchesCanonicalCity(p, city))
    if (isCityPageIndexable(cityPlaces.length, city.slug)) {
      pages.push({
        url: `${base}/sin-gluten/${city.slug}`,
        lastModified: maxUpdatedAt(cityPlaces) ?? undefined,
        changeFrequency: "weekly",
        priority: 0.85,
      })
      // /top-sin-gluten-* redirige 301 a /sin-gluten/[ciudad] — no entra al sitemap
    }
    for (const cat of CATEGORIES) {
      const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
      const catPlaces = cityPlaces.filter((p) => placeHasType(p, type))
      if (isCityCategoryIndexable(catPlaces.length, city.slug)) {
        pages.push({
          url: `${base}/sin-gluten/${city.slug}/${cat.slug}`,
          lastModified: maxUpdatedAt(catPlaces) ?? undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
    }
  }

  for (const cat of CATEGORIES) {
    const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
    const catPlaces = places.filter((p) => placeHasType(p, type))
    if (isCityCategoryIndexable(catPlaces.length)) {
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
