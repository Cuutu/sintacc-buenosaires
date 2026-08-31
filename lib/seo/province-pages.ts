import { cache } from "react"
import { getProvinceBySlug, type ProvinceConfig } from "./provinces"
import {
  getPlacesByProvinceSlug,
  getProvinceLocalities,
  getProvinceLastUpdated,
  type PlaceSEO,
} from "./places"
import { CATEGORIES, CATEGORY_SLUG_TO_TYPE } from "./cities"
import { isProvinceCategoryIndexable } from "./indexing-rules"

export type ProvinceLocalities = {
  name: string
  slug: string
  count: number
  citySlug?: string
}

export type ProvinceCategorySummary = {
  slug: string
  name: string
  emoji: string
  count: number
  indexable: boolean
}

export type ProvincePageData = {
  province: ProvinceConfig
  places: PlaceSEO[]
  total: number
  dedicatedGfCount: number
  gfOptionsCount: number
  localities: ProvinceLocalities[]
  categories: ProvinceCategorySummary[]
  lastUpdated: Date | null
}

export type ProvinceCategoryPageData = {
  province: ProvinceConfig
  categorySlug: string
  places: PlaceSEO[]
  total: number
  localities: ProvinceLocalities[]
  lastUpdated: Date | null
}

async function loadProvincePageData(provinceSlug: string): Promise<ProvincePageData> {
  const province = getProvinceBySlug(provinceSlug)
  if (!province) {
    return {
      province: { name: provinceSlug, slug: provinceSlug, aliases: [], countryCode: "AR" },
      places: [],
      total: 0,
      dedicatedGfCount: 0,
      gfOptionsCount: 0,
      localities: [],
      categories: [],
      lastUpdated: null,
    }
  }

  const [{ places, total }, localities, lastUpdated] = await Promise.all([
    getPlacesByProvinceSlug(provinceSlug, { limit: 200 }),
    getProvinceLocalities(provinceSlug),
    getProvinceLastUpdated(provinceSlug),
  ])

  const dedicatedGfCount = places.filter(
    (p) => p.safetyLevel === "dedicated_gf" || p.tags?.includes("100_gf")
  ).length
  const gfOptionsCount = places.filter(
    (p) => p.safetyLevel === "gf_options" || p.tags?.includes("opciones_sin_tacc")
  ).length

  const categories: ProvinceCategorySummary[] = []
  for (const cat of CATEGORIES) {
    const type = CATEGORY_SLUG_TO_TYPE[cat.slug]
    const count = places.filter(
      (p) => p.type === type || p.types?.includes(type)
    ).length
    if (count > 0) {
      categories.push({
        slug: cat.slug,
        name: cat.name,
        emoji: cat.emoji,
        count,
        indexable: isProvinceCategoryIndexable(count),
      })
    }
  }

  return {
    province,
    places,
    total,
    dedicatedGfCount,
    gfOptionsCount,
    localities,
    categories,
    lastUpdated,
  }
}

/** Deduplica generateMetadata + page en el mismo request. */
export const getProvincePageData = cache(loadProvincePageData)

async function loadProvinceCategoryPageData(
  provinceSlug: string,
  categorySlug: string
): Promise<ProvinceCategoryPageData> {
  const province = getProvinceBySlug(provinceSlug)
  if (!province) {
    return {
      province: { name: provinceSlug, slug: provinceSlug, aliases: [], countryCode: "AR" },
      categorySlug,
      places: [],
      total: 0,
      localities: [],
      lastUpdated: null,
    }
  }

  const [{ places, total }, localities, lastUpdated] = await Promise.all([
    getPlacesByProvinceSlug(provinceSlug, { categorySlug, limit: 200 }),
    getProvinceLocalities(provinceSlug),
    getProvinceLastUpdated(provinceSlug),
  ])

  return {
    province,
    categorySlug,
    places,
    total,
    localities,
    lastUpdated,
  }
}

export const getProvinceCategoryPageData = cache(loadProvinceCategoryPageData)