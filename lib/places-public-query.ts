import type { FilterQuery } from "mongoose"
import type { IPlace } from "@/models/Place"
import type { PublicPlacesQuery } from "@/lib/validations"
import { getCityBySlug } from "@/lib/seo/cities"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { getNeighborhoodSearchValues } from "@/lib/map-search"

function makeSearchRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
}

function makeExactDiacriticInsensitiveRegex(value: string): RegExp {
  const pattern = value
    .trim()
    .split("")
    .map((char) => {
      if (/\s/.test(char)) return "\\s+"
      const normalizedChar = char
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()

      switch (normalizedChar) {
        case "a":
          return "[aáàäâãAÁÀÄÂÃ]"
        case "e":
          return "[eéèëêEÉÈËÊ]"
        case "i":
          return "[iíìïîIÍÌÏÎ]"
        case "o":
          return "[oóòöôõOÓÒÖÔÕ]"
        case "u":
          return "[uúùüûUÚÙÜÛ]"
        case "n":
          return "[nñNÑ]"
        default:
          return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      }
    })
    .join("")

  return new RegExp(`^${pattern}$`, "i")
}

function appendAnd(query: FilterQuery<IPlace>, condition: FilterQuery<IPlace>): void {
  query.$and = [...(query.$and ?? []), condition]
}

export function buildPublicPlacesMongoQuery(
  params: PublicPlacesQuery
): FilterQuery<IPlace> {
  const query: FilterQuery<IPlace> = { status: "approved" }

  if (params.search?.trim()) {
    const words = params.search.trim().split(/\s+/).filter(Boolean)
    const regexes = words.map((word) => {
      const regex = makeSearchRegex(word)
      return {
        $or: [
          { name: regex },
          { address: regex },
          { addressText: regex },
          { neighborhood: regex },
          { userProvidedNeighborhood: regex },
          { userProvidedReference: regex },
        ],
      }
    })
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
    const neighborhoodValues = getNeighborhoodSearchValues(params.neighborhood)
    if (neighborhoodValues.length > 0) {
      const neighborhoodMatchers = neighborhoodValues.map(makeExactDiacriticInsensitiveRegex)
      appendAnd(query, {
        $or: [
          { neighborhood: { $in: neighborhoodMatchers } },
          { userProvidedNeighborhood: { $in: neighborhoodMatchers } },
        ],
      })
    }
  }

  if (params.tags && params.tags.length > 0) {
    query.tags = { $in: params.tags }
  }

  if (params.safetyLevel) {
    query.safetyLevel = params.safetyLevel
  }

  if (params.bbox) {
    const lngCondition =
      params.bbox.west <= params.bbox.east
        ? { $gte: params.bbox.west, $lte: params.bbox.east }
        : { $or: [{ "location.lng": { $gte: params.bbox.west } }, { "location.lng": { $lte: params.bbox.east } }] }

    query["location.lat"] = { $gte: params.bbox.south, $lte: params.bbox.north }
    if ("$or" in lngCondition) {
      appendAnd(query, { $or: lngCondition.$or })
    } else {
      query["location.lng"] = lngCondition
    }
  }

  return query
}
