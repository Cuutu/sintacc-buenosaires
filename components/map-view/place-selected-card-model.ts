import { TYPES, TAG_BADGE_CONFIG } from "@/lib/constants"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import {
  formatShortPlaceAddress as formatCanonicalShortAddress,
  getCanonicalPlaceArea,
  type PlaceLocationFields,
} from "@/lib/place-location-display"
import { getPlacePath } from "@/lib/place-url"
import type { PlaceReviewSource } from "@/lib/place-review-display"
import type { IPlace } from "@/models/Place"

export { getCanonicalPlaceArea }

export const PLACE_CARD = {
  olive: "#1F4D35",
  terracotta: "#C85A2E",
  muted: "#5F6B63",
  bg: "#F8F5EF",
  border: "#E8E1D6",
} as const

export type PlaceCardSafety = {
  label: string
  accent: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((item) => [item.value, item.label])
)

export function getPlaceTypeKey(place: Pick<IPlace, "type" | "types">): string {
  return String(place.types?.[0] ?? place.type ?? "other")
}

export function getPlaceTypeLabel(place: Pick<IPlace, "type" | "types">): string {
  const key = getPlaceTypeKey(place)
  return TYPE_LABELS[key] ?? "Lugar"
}

export function getPlaceSafety(place: IPlace): PlaceCardSafety {
  const level = inferSafetyLevel(place) ?? "unknown"
  if (level === "dedicated_gf") {
    return {
      label: "100% sin TACC",
      accent: PLACE_CARD.olive,
      badgeBg: "rgba(31,77,53,0.10)",
      badgeBorder: "rgba(31,77,53,0.22)",
      badgeText: PLACE_CARD.olive,
    }
  }
  if (level === "gf_options") {
    return {
      label: "Con opciones",
      accent: PLACE_CARD.terracotta,
      badgeBg: "rgba(200,90,46,0.12)",
      badgeBorder: "rgba(200,90,46,0.28)",
      badgeText: "#A84A26",
    }
  }
  return {
    label: "Sin información",
    accent: "#CFC9BF",
    badgeBg: "rgba(207,201,191,0.35)",
    badgeBorder: "rgba(207,201,191,0.9)",
    badgeText: "#6B645C",
  }
}

export type PlaceCoverTheme = {
  bg: string
  ink: string
  texture: "celi-trigo-crema" | "celi-trigo-oliva"
}

/** Portada editorial de la tarjeta cuando el lugar no tiene foto. */
export function getPlaceCoverTheme(place: IPlace): PlaceCoverTheme {
  return getCoverThemeForLevel(inferSafetyLevel(place))
}

/** Misma portada a partir del nivel ya resuelto (p. ej. la ficha, que lo calcula en el servidor). */
export function getCoverThemeForLevel(level: string | null | undefined): PlaceCoverTheme {
  if (level === "dedicated_gf") {
    return { bg: "#2D4A34", ink: "#F7F3EB", texture: "celi-trigo-crema" }
  }
  if (level === "gf_options") {
    return { bg: "#EAD9C6", ink: "#2D4A34", texture: "celi-trigo-oliva" }
  }
  return { bg: "#E4E0D6", ink: "#2D4A34", texture: "celi-trigo-oliva" }
}

export type PlaceCardRating = {
  score: string
  source: "CeliMap" | "Google"
  /** Texto completo para lectores de pantalla: "Google 4.5 · 120 reseñas". */
  label: string
}

/**
 * Un solo puntaje para la tarjeta, siempre con su fuente: el de la comunidad si
 * hay reseñas en CeliMap, si no el de Google. Nunca inventa uno.
 */
export function getPlaceCardRating(place: PlaceReviewSource): PlaceCardRating | null {
  const totalReviews = place.stats?.totalReviews ?? 0
  const avgRating = place.stats?.avgRating ?? 0
  if (totalReviews > 0 && avgRating > 0) {
    const score = avgRating.toFixed(1)
    return {
      score,
      source: "CeliMap",
      label: `CeliMap ${score} · ${totalReviews} reseña${totalReviews === 1 ? "" : "s"}`,
    }
  }
  const googleRating = place.googleSnapshot?.rating
  if (googleRating == null) return null
  const score = googleRating.toFixed(1)
  const count = place.googleSnapshot?.userRatingCount
  const countBit =
    count != null ? ` · ${count.toLocaleString("es-AR")} reseña${count === 1 ? "" : "s"}` : ""
  return { score, source: "Google", label: `Google ${score}${countBit}` }
}

export function formatShortPlaceAddress(place: PlaceLocationFields): string {
  return formatCanonicalShortAddress(place)
}

export function getPlaceDirectionsUrl(place: Pick<IPlace, "name" | "location">): string {
  const lng = place.location?.lng
  const lat = place.location?.lat
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
}

/**
 * Ficha del lugar en Google Maps (fotos, reseñas, horarios de Google). Con
 * `googlePlaceId` abre exactamente ese lugar; si no, busca nombre + dirección.
 * "Cómo llegar" (getPlaceDirectionsUrl) sigue siendo la ruta.
 */
export function getPlaceGoogleMapsUrl(
  place: Pick<IPlace, "name" | "location" | "address" | "googlePlaceId">
): string {
  const name = place.name?.trim() ?? ""
  const address = place.address?.trim() ?? ""
  const lat = place.location?.lat
  const lng = place.location?.lng
  const query = address
    ? [name, address].filter(Boolean).join(", ")
    : !place.googlePlaceId && Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat},${lng}`
      : name
  const params = new URLSearchParams({ api: "1", query })
  const googlePlaceId = place.googlePlaceId?.trim()
  if (googlePlaceId) params.set("query_place_id", googlePlaceId)
  return `https://www.google.com/maps/search/?${params.toString()}`
}

export function getPlaceDetailPath(place: IPlace): string {
  return getPlacePath(place)
}

const SHEET_DETAIL_TAG_ORDER = ["cocina_separada", "certificado_sin_tacc"] as const

export function getPlaceSheetDetailTags(
  tags: string[] | undefined | null
): { id: (typeof SHEET_DETAIL_TAG_ORDER)[number]; label: string }[] {
  const present = new Set(tags ?? [])
  return SHEET_DETAIL_TAG_ORDER.filter((id) => present.has(id)).map((id) => ({
    id,
    label: TAG_BADGE_CONFIG[id].label,
  }))
}
