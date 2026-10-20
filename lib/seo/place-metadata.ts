import type { Metadata } from "next"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getBaseUrl } from "@/lib/base-url"
import { getCanonicalPlaceArea } from "@/lib/place-location-display"
import { getPlacePath } from "@/lib/place-url"
import { OG_IMAGE, OG_IMAGE_PATH } from "@/lib/seo/og"

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
  addressText?: string | null
  province?: string | null
  locality?: string | null
  location?: { lat?: number | null; lng?: number | null } | null
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
  const area = getCanonicalPlaceArea(place)
  if (!isWeakPlaceLabel(area)) return area
  return ""
}

/** ¿El nombre ya dice "sin TACC"? "Gluten free" o "libre de gluten" no cuentan: no es lo que busca la gente. */
export function nameStatesSinTacc(name: string): boolean {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("sin tacc")
}

/** inferSafetyLevel no acepta null en safetyLevel (los docs lean sí pueden traerlo). */
function placeSafety(place: PlaceMetadataInput) {
  return inferSafetyLevel({ tags: place.tags, safetyLevel: place.safetyLevel ?? undefined })
}

/** Misma inferencia que la UI. Dedicado → sin TACC; opciones → con opciones. Si dudás, no 100%. */
export function placeOfferPhrase(place: PlaceMetadataInput): string {
  const safety = placeSafety(place)
  if (safety === "dedicated_gf") return "sin TACC"
  if (safety === "gf_options") return "con opciones sin TACC"
  return ""
}

/**
 * La oferta se omite solo si el lugar es 100% y el nombre ya dice "sin TACC":
 * "Pain du Jour - Gluten Free" igual lleva "sin TACC". Con opciones se aclara
 * siempre: un nombre con "Gluten Free" en un lugar con opciones confunde.
 */
function skipOfferPhrase(place: PlaceMetadataInput): boolean {
  return placeSafety(place) === "dedicated_gf" && nameStatesSinTacc(place.name)
}

function tipoOferta(place: PlaceMetadataInput, skipOffer: boolean): string {
  const typeLabel = placeTypeLabel(place)
  const offer = skipOffer ? "" : placeOfferPhrase(place)
  return [typeLabel, offer].filter(Boolean).join(" ")
}

export function buildPlaceTitle(place: PlaceMetadataInput): string {
  const skipOffer = skipOfferPhrase(place)
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
  const skipOffer = skipOfferPhrase(place)
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
  const skipOffer = skipOfferPhrase(place)
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
  const photo = place.photos?.[0]
  const ogImage = photo || `${baseUrl}${OG_IMAGE_PATH}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [
        photo
          ? { url: photo, width: 1200, height: 630, alt: place.name }
          : { ...OG_IMAGE, url: ogImage },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}
