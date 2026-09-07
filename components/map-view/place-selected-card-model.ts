import { TYPES, TAG_BADGE_CONFIG } from "@/lib/constants"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import {
  formatShortPlaceAddress as formatCanonicalShortAddress,
  getCanonicalPlaceArea,
  type PlaceLocationFields,
} from "@/lib/place-location-display"
import { getPlacePath } from "@/lib/place-url"
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
