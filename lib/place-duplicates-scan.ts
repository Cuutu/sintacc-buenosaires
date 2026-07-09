import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import {
  findDuplicateCandidates,
  getDuplicateMatchLevel,
  type DuplicateDraft,
} from "@/lib/place-duplicates"

export type PlaceDuplicatePair = {
  placeA: {
    id: string
    name: string
    address?: string
    neighborhood?: string
    type?: string
  }
  placeB: {
    id: string
    name: string
    address?: string
    neighborhood?: string
    type?: string
  }
  matchLevel: "exact" | "likely"
  score: number
  reasons: string[]
}

function toDuplicateDraft(place: Record<string, unknown>): DuplicateDraft {
  return {
    _id: place._id,
    name: place.name as string | undefined,
    type: place.type as string | undefined,
    types: place.types as string[] | undefined,
    address: (place.addressText as string | undefined) || (place.address as string | undefined),
    neighborhood: place.neighborhood as string | undefined,
    location: place.location as DuplicateDraft["location"],
    contact: place.contact as DuplicateDraft["contact"],
    status: place.status as string | undefined,
  }
}

function toPlaceSummary(place: Record<string, unknown>) {
  return {
    id: String(place._id),
    name: String(place.name ?? "Sin nombre"),
    address: (place.address as string | undefined) || (place.addressText as string | undefined),
    neighborhood: place.neighborhood as string | undefined,
    type: (place.types as string[] | undefined)?.[0] || (place.type as string | undefined),
  }
}

export async function scanPublishedPlaceDuplicates(limit = 2500): Promise<{
  pairs: PlaceDuplicatePair[]
  scanned: number
}> {
  await connectDB()
  const places = await Place.find({ status: "approved" })
    .select("name type types address addressText neighborhood location contact status")
    .limit(limit)
    .lean()

  const pairs: PlaceDuplicatePair[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < places.length; i++) {
    const source = places[i]
    const sourceDraft = toDuplicateDraft(source as Record<string, unknown>)
    const candidates = places
      .slice(i + 1)
      .map((place) => ({
        ...toDuplicateDraft(place as Record<string, unknown>),
        kind: "place" as const,
      }))

    const matches = findDuplicateCandidates(sourceDraft, candidates, {
      threshold: 50,
      limit: 5,
    })

    for (const match of matches) {
      const matchLevel = getDuplicateMatchLevel(match.reasons, match.score)
      if (!matchLevel) continue

      const pairKey = [String(source._id), match.id].sort().join(":")
      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)

      const target = places.find((place) => String(place._id) === match.id)
      if (!target) continue

      pairs.push({
        placeA: toPlaceSummary(source as Record<string, unknown>),
        placeB: toPlaceSummary(target as Record<string, unknown>),
        matchLevel,
        score: match.score,
        reasons: match.reasons,
      })
    }
  }

  const exactPairs = pairs.filter((pair) => pair.matchLevel === "exact")

  exactPairs.sort((a, b) => b.score - a.score)

  return { pairs: exactPairs, scanned: places.length }
}
