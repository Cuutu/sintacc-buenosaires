import type { KmlPlaceDraft } from "@/lib/kml-sintacc/types"
import {
  findDuplicateCandidates,
  getDuplicateMatchLevel,
  type DuplicateDraft,
} from "@/lib/place-duplicates"

/** Likely lejos sin contacto compartido = otra sucursal, no dupe. */
export const FAR_LIKELY_METERS = 500
/** Nuevo pero hay lugar DB a ≤ esta distancia + nombre parecido. */
export const NEAR_EXISTING_METERS = 80

export type MatchKind =
  | "exact"
  | "likely"
  | "other_branch"
  | "near_existing"
  | "nuevo"

const NAME_STOPWORDS = new Set([
  "cafe",
  "cafeteria",
  "bar",
  "resto",
  "restaurant",
  "restaurante",
  "pizzeria",
  "panaderia",
  "bakery",
  "gluten",
  "free",
  "sintacc",
  "sin",
  "tacc",
  "delivery",
  "take",
  "away",
  "palermo",
  "recoleta",
  "belgrano",
  "caballito",
  "urquiza",
  "devoto",
  "nunez",
  "nuñez",
  "madero",
  "puerto",
  "centro",
  "microcentro",
  "colegiales",
  "villa",
  "norte",
  "sur",
  "oeste",
  "soho",
  "norte",
  "lanus",
  "lomitas",
  "nordelta",
  "canning",
])

export function draftToDuplicate(draft: KmlPlaceDraft): DuplicateDraft {
  return {
    name: draft.name,
    type: draft.type,
    address: draft.address,
    addressText: draft.addressText || draft.address,
    neighborhood: draft.neighborhood,
    location: draft.location,
    contact: draft.contact,
  }
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function findNearest(
  draft: KmlPlaceDraft,
  places: Array<{
    name?: string
    location?: { lat?: number; lng?: number }
  }>
): { name: string; distanceMeters: number } | null {
  let best: { name: string; distanceMeters: number } | null = null
  for (const place of places) {
    const lat = place.location?.lat
    const lng = place.location?.lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const distanceMeters = haversineMeters(draft.location, {
      lat: lat as number,
      lng: lng as number,
    })
    if (!best || distanceMeters < best.distanceMeters) {
      best = { name: place.name || "Sin nombre", distanceMeters }
    }
  }
  return best
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function namesProbablySame(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na.length < 4 || nb.length < 4) return false
  if (na === nb) return true
  const ca = na.replace(/\s+/g, "")
  const cb = nb.replace(/\s+/g, "")
  if (ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca))) {
    return true
  }
  const tokensA = [
    ...new Set(
      na.split(" ").filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t))
    ),
  ]
  const tokensB = [
    ...new Set(
      nb.split(" ").filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t))
    ),
  ]
  if (tokensA.length === 0 || tokensB.length === 0) return false
  const setA = new Set(tokensA)
  const overlap = tokensB.filter((t) => setA.has(t)).length
  return overlap >= 1
}

export function classifyMatch(opts: {
  matchLevel: "exact" | "likely" | null
  reasons?: string[]
  distanceMeters?: number
  nearestDistanceMeters?: number
  kmlName?: string
  nearestName?: string
}): MatchKind {
  const {
    matchLevel,
    reasons = [],
    distanceMeters,
    nearestDistanceMeters,
    kmlName,
    nearestName,
  } = opts

  if (matchLevel === "exact") return "exact"

  if (matchLevel === "likely") {
    const sharedContact = reasons.some(
      (r) => r === "mismo instagram" || r === "mismo link"
    )
    const far =
      distanceMeters != null &&
      distanceMeters > FAR_LIKELY_METERS &&
      !sharedContact
    if (far) return "other_branch"
    return "likely"
  }

  if (
    nearestDistanceMeters != null &&
    nearestDistanceMeters <= NEAR_EXISTING_METERS &&
    kmlName &&
    nearestName &&
    namesProbablySame(kmlName, nearestName)
  ) {
    return "near_existing"
  }

  return "nuevo"
}

export function classifyDraftAgainstPlaces(
  draft: KmlPlaceDraft,
  candidates: Array<DuplicateDraft & { kind: "place" }>,
  placesForNearest: Array<{
    name?: string
    location?: { lat?: number; lng?: number }
  }>
): {
  matchKind: MatchKind
  score?: number
  reasons?: string[]
  distanceMeters?: number
  nearestDistanceMeters?: number
  nearestName?: string
  existingId?: string
  existingName?: string
} {
  const matches = findDuplicateCandidates(draftToDuplicate(draft), candidates, {
    threshold: 50,
    limit: 1,
  })
  const top = matches[0]
  const matchLevel = top
    ? getDuplicateMatchLevel(top.reasons, top.score)
    : null
  const nearest = findNearest(draft, placesForNearest)
  const matchKind = classifyMatch({
    matchLevel,
    reasons: top?.reasons,
    distanceMeters: top?.distanceMeters,
    nearestDistanceMeters: nearest?.distanceMeters,
    kmlName: draft.name,
    nearestName: nearest?.name,
  })

  return {
    matchKind,
    score: top?.score,
    reasons: top?.reasons,
    distanceMeters: top?.distanceMeters,
    nearestDistanceMeters: nearest?.distanceMeters,
    nearestName: nearest?.name,
    existingId: top?.id,
    existingName: top?.name,
  }
}

/** Kinds que se importan como lugares nuevos (no tocar existing). */
export const IMPORTABLE_MATCH_KINDS: MatchKind[] = ["nuevo", "other_branch"]
