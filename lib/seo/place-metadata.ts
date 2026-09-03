import type { Metadata } from "next"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"

export const PLACE_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Lugar",
}

export type PlaceMetadataInput = {
  _id?: { toString(): string } | string
  slug?: string | null
  name: string
  neighborhood?: string | null
  type: string
  types?: string[]
  address?: string | null
  province?: string | null
  locality?: string | null
  photos?: string[]
  tags?: string[]
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown" | null
}

function isWeakPlaceLabel(value?: string | null): boolean {
  if (!value?.trim()) return true
  const v = value.trim()
  if (v.length < 2) return true
  return /^(n\/a|na|-|sin barrio|argentina|undefined|null)$/i.test(v)
}

export function placeTypeLabel(place: Pick<PlaceMetadataInput, "type" | "types">): string {
  const key = place.types?.[0] || place.type
  return PLACE_TYPE_LABELS[key] || "Lugar"
}

export function shortPlaceLabel(place: PlaceMetadataInput): string {
  if (!isWeakPlaceLabel(place.neighborhood)) return place.neighborhood!.trim()
  if (!isWeakPlaceLabel(place.locality)) {
    return place.locality!.trim().replace(/-/g, " ")
  }
  return ""
}

export function nameAlreadyStatesOffer(name: string): boolean {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  return (
    n.includes("sin tacc") ||
    n.includes("sin gluten") ||
    n.includes("gluten free") ||
    n.includes("libre de gluten")
  )
}

/** Misma inferencia que la UI. Dedicado → sin TACC; opciones → con opciones. Si dudás, no 100%. */
export function placeOfferPhrase(place: PlaceMetadataInput): string {
  const safety = inferSafetyLevel(place)
  if (safety === "dedicated_gf") return "sin TACC"
  if (safety === "gf_options") return "con opciones sin TACC"
  return ""
}

function tipoOferta(place: PlaceMetadataInput, skipOffer: boolean): string {
  const typeLabel = placeTypeLabel(place)
  const offer = skipOffer ? "" : placeOfferPhrase(place)
  return [typeLabel, offer].filter(Boolean).join(" ")
}

export function buildPlaceTitle(place: PlaceMetadataInput): string {
  const skipOffer = nameAlreadyStatesOffer(place.name)
  const mid = tipoOferta(place, skipOffer)
  const loc = shortPlaceLabel(place)
  if (loc) return `${place.name} | ${mid} en ${loc}`
  return `${place.name} | ${mid}`
}

function shortAddress(address?: string | null): string {
  if (!address?.trim()) return ""
  const first = address.split(",")[0]?.trim() ?? ""
  if (first.length > 42) return `${first.slice(0, 39).trim()}…`
  return first
}

export function buildPlaceDescription(place: PlaceMetadataInput): string {
  const skipOffer = nameAlreadyStatesOffer(place.name)
  const mid = tipoOferta(place, skipOffer)
  const loc = shortPlaceLabel(place)
  const locBit = loc ? ` en ${loc}` : ""
  const close = "Reseñas y clasificación según datos de CeliMap; confirmá en el local."
  const lead = `${place.name}: ${mid}${locBit}.`
  const addr = shortAddress(place.address)
  const withAddr =
    addr && !lead.toLowerCase().includes(addr.toLowerCase()) ? `${lead} ${addr}. ${close}` : `${lead} ${close}`
  if (withAddr.length <= 160) return withAddr
  const withoutAddr = `${lead} ${close}`
  if (withoutAddr.length <= 160) return withoutAddr
  return withoutAddr.slice(0, 157).trimEnd() + "…"
}

export function placeCategoryLine(place: PlaceMetadataInput): string {
  const skipOffer = nameAlreadyStatesOffer(place.name)
  const offer = skipOffer ? "" : placeOfferPhrase(place)
  return [placeTypeLabel(place), offer, shortPlaceLabel(place)].filter(Boolean).join(" · ")
}

export function buildPlaceMetadata(place: PlaceMetadataInput): Metadata {
  const baseUrl = getBaseUrl()
  const canonical = `${baseUrl}${getPlacePath({
    _id: place._id ?? place.slug ?? "",
    slug: place.slug,
  })}`
  const title = buildPlaceTitle(place)
  const description = buildPlaceDescription(place)
  const ogImage = place.photos?.[0] || `${baseUrl}/CelimapLOGO.png`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: place.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}
