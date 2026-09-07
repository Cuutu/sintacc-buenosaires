import { NEIGHBORHOODS } from "@/lib/constants"
import { getCityBySlug } from "@/lib/seo/cities"
import { getProvinceBySlug } from "@/lib/seo/provinces"

/**
 * Display-only location helpers.
 *
 * Stale `neighborhood` values (CABA barrios copied from a street name like
 * "Gral. Belgrano") must not win over city/province evidence from address,
 * locality slug, or lat/lng. We do not rewrite Mongo — only what we show.
 *
 * Resolution order for the area label:
 * 1. If coords are outside CABA and `neighborhood` is a CABA barrio → ignore it.
 *    Use locality (if not CABA) or city parsed from address.
 * 2. Else if neighborhood is a CABA barrio but address/locality name a different
 *    non-CABA city → use that city.
 * 3. Else neighborhood (when not weak / "Otro").
 * 4. Else locality display name or parsed city.
 */

export type PlaceLocationFields = {
  address?: string | null
  addressText?: string | null
  neighborhood?: string | null
  locality?: string | null
  province?: string | null
  location?: { lat?: number | null; lng?: number | null } | null
}

/** Generous CABA box. Campana (~-34.16, -58.96) is well outside. */
const CABA_BOUNDS = {
  west: -58.53,
  east: -58.33,
  south: -34.71,
  north: -34.53,
}

const CABA_BARRIO_FOLDS = new Set(
  NEIGHBORHOODS.filter((name) => name !== "Otro").map((name) => fold(name))
)

const POSTAL_RE = /^[a-z]?\d{4}[a-z]{0,3}$/i
const POSTAL_PREFIX_RE = /^([a-z]?\d{4}[a-z]{0,3})\s+(.+)$/i
const REGION_RE =
  /^(argentina|ciudad autonoma de buenos aires|caba|buenos aires|provincia de buenos aires|pba)$/i
const WEAK_AREA_RE = /^(n\/a|na|-|sin barrio|argentina|undefined|null|otro)$/i

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isWeakArea(value?: string | null): boolean {
  if (!value?.trim()) return true
  return WEAK_AREA_RE.test(fold(value))
}

export function isCabaBarrio(name?: string | null): boolean {
  if (!name?.trim()) return false
  return CABA_BARRIO_FOLDS.has(fold(name))
}

export function coordsInCaba(lat?: number | null, lng?: number | null): boolean | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return (
    (lng as number) >= CABA_BOUNDS.west &&
    (lng as number) <= CABA_BOUNDS.east &&
    (lat as number) >= CABA_BOUNDS.south &&
    (lat as number) <= CABA_BOUNDS.north
  )
}

function isCabaLocality(slug?: string | null): boolean {
  const normalized = fold(slug || "").replace(/\s+/g, "-")
  return (
    normalized === "caba" ||
    normalized === "buenos-aires" ||
    normalized === "ciudad-autonoma-de-buenos-aires"
  )
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function localityDisplay(slug?: string | null): string {
  if (!slug?.trim()) return ""
  const city = getCityBySlug(slug.trim())
  if (city?.name) return city.name
  return humanizeSlug(slug.trim())
}

function splitParts(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

type ParsedAddress = {
  street: string
  city: string
  postal: string
}

export function parsePlaceAddress(raw: string): ParsedAddress {
  const parts = splitParts(raw)
  let postal = ""
  const kept: string[] = []

  for (const part of parts) {
    if (POSTAL_RE.test(part)) {
      if (!postal) postal = part
      continue
    }
    const prefixed = part.match(POSTAL_PREFIX_RE)
    const rest = prefixed ? prefixed[2] : part
    if (prefixed && !postal) postal = prefixed[1]
    if (REGION_RE.test(fold(rest))) continue
    kept.push(rest)
  }

  const street = kept[0] ?? ""
  const city = kept.length > 1 ? kept[kept.length - 1] : ""
  return { street, city, postal }
}

function provinceLabel(place: PlaceLocationFields): string {
  const slug = (place.province || "").trim()
  if (slug === "caba") return "CABA"
  if (slug === "buenos-aires") return "Provincia de Buenos Aires"
  const named = slug ? getProvinceBySlug(slug)?.name : undefined
  if (named) return named

  const raw = place.addressText || place.address || ""
  for (const part of splitParts(raw)) {
    const folded = fold(part)
    if (folded === "provincia de buenos aires" || folded === "pba") {
      return "Provincia de Buenos Aires"
    }
    if (folded === "caba" || folded === "ciudad autonoma de buenos aires") {
      return "CABA"
    }
  }
  return ""
}

export function getCanonicalPlaceArea(place: PlaceLocationFields): string {
  const neighborhood = (place.neighborhood || "").trim()
  const parsed = parsePlaceAddress(place.addressText || place.address || "")
  const parsedCity = parsed.city
  const localityName = localityDisplay(place.locality)
  const localityIsCaba = isCabaLocality(place.locality)
  const nonCabaLocality = localityName && !localityIsCaba ? localityName : ""
  const inCaba = coordsInCaba(place.location?.lat, place.location?.lng)
  const barrioIsCaba = isCabaBarrio(neighborhood)

  if (inCaba === false && barrioIsCaba) {
    if (nonCabaLocality) return nonCabaLocality
    if (parsedCity && !isCabaBarrio(parsedCity)) return parsedCity
    return ""
  }

  const otherCity = nonCabaLocality || (parsedCity && !isCabaBarrio(parsedCity) ? parsedCity : "")
  if (barrioIsCaba && otherCity && fold(otherCity) !== fold(neighborhood) && inCaba !== true) {
    return otherCity
  }

  if (!isWeakArea(neighborhood)) return neighborhood
  if (nonCabaLocality) return nonCabaLocality
  if (parsedCity) return parsedCity
  if (localityName) return localityName
  return ""
}

export function formatShortPlaceAddress(place: PlaceLocationFields): string {
  const area = getCanonicalPlaceArea(place)
  const { street } = parsePlaceAddress(place.addressText || place.address || "")
  if (street && area && fold(street) !== fold(area)) return `${street}, ${area}`
  return street || area
}

export function formatFullPlaceAddress(place: PlaceLocationFields): string {
  const area = getCanonicalPlaceArea(place)
  const parsed = parsePlaceAddress(place.addressText || place.address || "")
  const province = provinceLabel(place)
  const chunks: string[] = []

  if (parsed.street) chunks.push(parsed.street)

  if (area && parsed.postal) {
    chunks.push(`${parsed.postal} ${area}`)
  } else if (area) {
    chunks.push(area)
  } else if (parsed.postal) {
    chunks.push(parsed.postal)
  }

  if (province) {
    const provinceFold = fold(province)
    const areaFold = fold(area)
    const isCabaProvince =
      provinceFold === "caba" || provinceFold.includes("ciudad autonoma")
    if (isCabaProvince) {
      if (area && isCabaBarrio(area)) chunks.push("CABA")
    } else if (provinceFold !== areaFold) {
      chunks.push(province)
    }
  }

  return chunks.join(", ")
}
