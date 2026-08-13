import type { FilterQuery } from "mongoose"
import type { IPlace } from "@/models/Place"
import type { PublicPlacesQuery } from "@/lib/validations"
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

export function filterPlacesByBbox<T extends { location?: { lat?: number; lng?: number } }>(
  places: T[],
  bbox: { west: number; south: number; east: number; north: number }
): T[] {
  const wrapsAntimeridian = bbox.west > bbox.east
  return places.filter((place) => {
    const lat = place.location?.lat
    const lng = place.location?.lng
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return false
    }
    if (lat < bbox.south || lat > bbox.north) return false
    if (wrapsAntimeridian) return lng >= bbox.west || lng <= bbox.east
    return lng >= bbox.west && lng <= bbox.east
  })
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
    // citySlugs son locality slugs normalizados (ej: "la-plata", "cordoba")
    query.locality = { $in: params.citySlugs }
  } else if (params.provinceSlugs && params.provinceSlugs.length > 0) {
    query.province = { $in: params.provinceSlugs }
  } else if (params.localitySlugs && params.localitySlugs.length > 0) {
    query.locality = { $in: params.localitySlugs }
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

  if (params.featured === true) {
    query.featured = true
  }

  return query
}