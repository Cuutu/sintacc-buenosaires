import type { FilterQuery } from "mongoose"
import type { IPlace } from "@/models/Place"
import type { PublicPlacesQuery } from "@/lib/validations"
import { getCityBySlug } from "@/lib/seo/cities"
import { getProvinceBySlug } from "@/lib/seo/provinces"

export function buildPublicPlacesMongoQuery(
  params: PublicPlacesQuery
): FilterQuery<IPlace> {
  const query: FilterQuery<IPlace> = { status: "approved" }

  if (params.search?.trim()) {
    const words = params.search.trim().split(/\s+/).filter(Boolean)
    const regexes = words.map((w) => ({
      $or: [
        { name: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { address: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { neighborhood: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      ],
    }))
    query.$and = regexes
  }

  if (params.type) {
    query.type = params.type
  }

  if (params.citySlugs && params.citySlugs.length > 0) {
    const allNeighborhoods: string[] = []
    for (const slug of params.citySlugs) {
      const province = getProvinceBySlug(slug)
      if (province) {
        for (const cs of province.citySlugs) {
          const city = getCityBySlug(cs)
          if (city) allNeighborhoods.push(...city.neighborhoods)
        }
      } else {
        const city = getCityBySlug(slug)
        if (city) allNeighborhoods.push(...city.neighborhoods)
      }
    }
    if (allNeighborhoods.length > 0) {
      query.neighborhood = { $in: [...new Set(allNeighborhoods)] }
    }
  } else if (params.neighborhood) {
    query.neighborhood = params.neighborhood
  }

  if (params.tags && params.tags.length > 0) {
    query.tags = { $in: params.tags }
  }

  if (params.safetyLevel) {
    query.safetyLevel = params.safetyLevel
  }

  return query
}
