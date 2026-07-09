import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import {
  findDuplicateCandidates,
  getDuplicateMatchLevel,
  type DuplicateCandidate,
  type DuplicateDraft,
} from "@/lib/place-duplicates"

export type DuplicateWarning = DuplicateCandidate & {
  matchLevel: "exact" | "likely"
  type?: string
}

export async function loadDuplicateCandidates(
  excludeSuggestionId?: string
): Promise<Array<DuplicateDraft & { kind: "place" | "suggestion" }>> {
  await connectDB()

  const [places, pendingSuggestions] = await Promise.all([
    Place.find(
      { status: "approved" },
      {
        name: 1,
        type: 1,
        types: 1,
        address: 1,
        addressText: 1,
        neighborhood: 1,
        location: 1,
        contact: 1,
        status: 1,
      }
    )
      .limit(5000)
      .lean(),
    Suggestion.find(
      { status: "pending" },
      {
        placeDraft: 1,
        status: 1,
      }
    ).lean(),
  ])

  const placeCandidates = places.map((place) => ({
    ...place,
    kind: "place" as const,
  }))

  const suggestionCandidates = pendingSuggestions
    .filter((item) => item._id.toString() !== excludeSuggestionId)
    .map((item) => ({
      _id: item._id,
      ...((item.placeDraft as DuplicateDraft) || {}),
      status: item.status,
      kind: "suggestion" as const,
    }))

  return [...placeCandidates, ...suggestionCandidates]
}

export async function findDuplicateWarningsForDraft(
  draft: DuplicateDraft,
  excludeSuggestionId?: string
): Promise<DuplicateWarning[]> {
  const candidates = await loadDuplicateCandidates(excludeSuggestionId)
  const matches = findDuplicateCandidates(draft, candidates, {
    threshold: 50,
    limit: 5,
  })

  return matches
    .map((match) => ({
      ...match,
      matchLevel: getDuplicateMatchLevel(match.reasons, match.score),
    }))
    .filter((match): match is DuplicateWarning => match.matchLevel != null)
}
