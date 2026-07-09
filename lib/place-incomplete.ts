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

function hasSafetyBadge(place: PlaceLike): boolean {
  if (place.safetyLevel && place.safetyLevel !== "unknown") return true
  return false
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

/** Ficha vacía o con informe IA pendiente de revisar / reintentar. */
export function isPlaceEnrichmentReviewCandidate(place: PlaceWithEnrichment): boolean {
  if (isPlaceInformationIncomplete(place)) return true
  const status = place.aiEnrichment?.status
  return status === "done" || status === "failed" || status === "running" || status === "queued"
}

export function countMissingEnrichmentFields(place: PlaceLike): string[] {
  const missing: string[] = []
  if (!hasContact(place)) missing.push("contacto")
  if (!place.openingHours?.trim()) missing.push("horarios")
  if (!place.photos?.length) missing.push("fotos")
  if (!hasSafetyBadge(place)) missing.push("clasificación TACC")
  if (isPlaceholderText(place.neighborhood)) missing.push("barrio")
  if (place.type === "other") missing.push("tipo")
  return missing
}
