import type { IPlace } from "@/models/Place"

const PLACEHOLDER_PATTERNS = [
  "a completar",
  "sin direccion",
  "ubicacion seleccionada",
  "ver link",
]

type PlaceLike = Pick<
  IPlace,
  | "name"
  | "address"
  | "neighborhood"
  | "contact"
  | "openingHours"
  | "photos"
  | "safetyLevel"
  | "type"
  | "tags"
>

type PlaceWithEnrichment = PlaceLike & {
  aiEnrichment?: { status?: string } | null
}

function isPlaceholderText(value?: string | null): boolean {
  if (!value?.trim()) return true
  const normalized = value.trim().toLowerCase()
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function hasContact(place: PlaceLike): boolean {
  return Boolean(
    place.contact?.instagram?.trim() ||
      place.contact?.url?.trim() ||
      place.contact?.phone?.trim() ||
      place.contact?.whatsapp?.trim()
  )
}

/** Nivel efectivo: safetyLevel en DB o inferido desde tags del editor. */
export function getEffectiveSafetyLevel(place: {
  safetyLevel?: IPlace["safetyLevel"]
  tags?: string[]
}): IPlace["safetyLevel"] | undefined {
  if (place.safetyLevel && place.safetyLevel !== "unknown") {
    return place.safetyLevel
  }
  const tags = place.tags ?? []
  if (tags.includes("100_gf") || tags.includes("certificado_sin_tacc")) {
    return "dedicated_gf"
  }
  if (tags.includes("opciones_sin_tacc")) return "gf_options"
  return undefined
}

/** Clasificado como 100% sin gluten u opciones sin TACC (lo del selector admin). */
export function hasTaccClassification(place: {
  safetyLevel?: IPlace["safetyLevel"]
  tags?: string[]
}): boolean {
  const level = getEffectiveSafetyLevel(place)
  return level === "dedicated_gf" || level === "gf_options"
}

function hasSafetyBadge(place: PlaceLike): boolean {
  return hasTaccClassification(place)
}

/** Lugar con poca ficha: solo nombre/dirección o datos muy vacíos. */
export function isPlaceInformationIncomplete(place: PlaceLike): boolean {
  if (!place.name?.trim()) return true
  if (isPlaceholderText(place.address)) return true
  if (isPlaceholderText(place.neighborhood)) return true

  const enrichmentSignals = [
    hasContact(place),
    Boolean(place.openingHours?.trim()),
    Boolean(place.photos?.length),
    hasSafetyBadge(place),
    Boolean(place.type && place.type !== "other"),
  ].filter(Boolean).length

  return enrichmentSignals < 2
}

export function isPlaceMissingTaccClassification(place: PlaceLike): boolean {
  return !hasTaccClassification(place)
}

/** Solo clasificación TACC para panel Sin información. */
export function countMissingConcreteFields(place: PlaceLike): string[] {
  if (!hasTaccClassification(place)) return ["clasificación TACC"]
  return []
}

export function isPlaceMissingConcreteInformation(place: PlaceLike): boolean {
  return isPlaceMissingTaccClassification(place)
}

/** Revisión admin: solo lugares sin 100% sin gluten ni opciones sin TACC. */
export function isPlaceEnrichmentReviewCandidate(place: PlaceWithEnrichment): boolean {
  return isPlaceMissingTaccClassification(place)
}

export function countMissingEnrichmentFields(place: PlaceLike): string[] {
  return countMissingConcreteFields(place)
}
