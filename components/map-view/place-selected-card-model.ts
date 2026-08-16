import { TYPES } from "@/lib/constants"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getPlacePath } from "@/lib/place-url"
import type { IPlace } from "@/models/Place"

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

export type PlaceCardRating = {
  score: string
  source: string
  countLabel: string
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((item) => [item.value, item.label])
)

const POSTAL_RE = /^(c?\d{4}[a-z]{0,3})$/i
const REGION_RE =
  /^(argentina|ciudad aut[oó]noma de buenos aires|caba|buenos aires|provincia de buenos aires)$/i

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
      label: "Tiene opciones",
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

export function formatShortPlaceAddress(place: Pick<IPlace, "address" | "addressText" | "neighborhood">): string {
  const neighborhood = String(place.neighborhood || "").trim()
  const raw = String(place.addressText || place.address || "").trim()
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !POSTAL_RE.test(part) && !REGION_RE.test(part))

  const street =
    parts.find((part) => part.toLowerCase() !== neighborhood.toLowerCase()) ??
    parts[0] ??
    ""

  if (street && neighborhood && street.toLowerCase() !== neighborhood.toLowerCase()) {
    return `${street}, ${neighborhood}`
  }
  return street || neighborhood
}

export function getPlaceRatingLine(
  place: IPlace & {
    stats?: { avgRating?: number; totalReviews?: number }
    googleSnapshot?: { rating?: number; userRatingCount?: number } | null
  }
): PlaceCardRating | null {
  const totalReviews = place.stats?.totalReviews ?? 0
  const avgRating = place.stats?.avgRating ?? 0
  if (totalReviews > 0 && avgRating > 0) {
    return {
      score: avgRating.toFixed(1),
      source: "CeliMap",
      countLabel: `(${totalReviews} reseña${totalReviews === 1 ? "" : "s"})`,
    }
  }
  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount
  if (googleRating != null) {
    const count = googleCount != null ? `(${googleCount} reseñas)` : ""
    return {
      score: googleRating.toFixed(1),
      source: "Google",
      countLabel: count,
    }
  }
  return null
}

export function getPlaceDirectionsUrl(place: Pick<IPlace, "name" | "location">): string {
  const lng = place.location?.lng
  const lat = place.location?.lat
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
}

export function getPlaceDetailPath(place: IPlace): string {
  return getPlacePath(place)
}
