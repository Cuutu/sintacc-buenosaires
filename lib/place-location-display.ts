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

/**
 * Los 48 barrios oficiales de CABA (+ cómo se los suele escribir). NEIGHBORHOODS tiene
 * solo 20 (los del formulario): con esa lista "San Nicolás" no era de CABA y la ficha
 * de Lavalle 1144 no decía "CABA" en la dirección.
 */
const CABA_BARRIOS = [
  "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo", "Caballito",
  "Chacarita", "Coghlan", "Colegiales", "Constitución", "Flores", "Floresta", "La Boca",
  "La Paternal", "Liniers", "Mataderos", "Monte Castro", "Monserrat", "Nueva Pompeya",
  "Núñez", "Palermo", "Parque Avellaneda", "Parque Chacabuco", "Parque Chas",
  "Parque Patricios", "Puerto Madero", "Recoleta", "Retiro", "Saavedra", "San Cristóbal",
  "San Nicolás", "San Telmo", "Vélez Sarsfield", "Versalles", "Villa Crespo",
  "Villa del Parque", "Villa Devoto", "Villa General Mitre", "Villa Lugano", "Villa Luro",
  "Villa Ortúzar", "Villa Pueyrredón", "Villa Real", "Villa Riachuelo", "Villa Santa Rita",
  "Villa Soldati", "Villa Urquiza",
  // Formas comunes.
  "Montserrat", "Boca", "Paternal", "Pompeya", "Barrio Norte",
]

const CABA_BARRIO_FOLDS = new Set(
  [...CABA_BARRIOS, ...NEIGHBORHOODS.filter((name) => name !== "Otro")].map((name) => fold(name))
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
  // (0, 0) es "sin ubicación" (un pin que no se cargó), no un lugar fuera de CABA:
  // antes borraba el barrio de la dirección ("Avenida de Mayo 1271, C1085").
  if (lat === 0 && lng === 0) return null
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

/** Palabras que van en minúscula en un nombre de lugar ("Concepción del Uruguay"). */
const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"])

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word, i) =>
      i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
}

/**
 * Nombre para mostrar de una localidad guardada como slug ("tres-arroyos") o
 * como nombre ("Tandil" / "tandil"): siempre el nombre, nunca el slug.
 */
export function formatLocalityName(value?: string | null): string {
  return localityDisplay(value)
}

function localityDisplay(raw?: string | null): string {
  const value = raw?.trim()
  if (!value) return ""
  const asSlug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
  const city = getCityBySlug(value) ?? getCityBySlug(asSlug)
  if (city?.name) return city.name
  // Ya viene como nombre ("Tandil", "San Carlos de Bariloche"): tal cual.
  if (/[A-ZÁÉÍÓÚÑÜ]/.test(value)) return value
  return humanizeSlug(value.replace(/\s+/g, "-"))
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

/**
 * Barrio y ciudad para el subtítulo de la ficha: "San Nicolás, CABA",
 * "Valeria del Mar, Pinamar", "Centro, Córdoba" o solo "Tandil". Siempre dice dónde
 * está, aunque el barrio falte (revisión 23/10). Vacío solo si no hay ningún dato.
 */
export function formatPlaceAreaLine(place: PlaceLocationFields): string {
  const area = getCanonicalPlaceArea(place)
  const inCaba = coordsInCaba(place.location?.lat, place.location?.lng)
  const isCaba =
    inCaba !== false &&
    (place.province === "caba" || isCabaLocality(place.locality) || (Boolean(area) && isCabaBarrio(area)))
  const locality = localityDisplay(place.locality)
  const city = isCaba ? "CABA" : locality && !isCabaLocality(place.locality) ? locality : ""
  if (area && city) {
    const a = fold(area)
    const c = fold(city)
    if (a === c || a.includes(c)) return area
    return `${area}, ${city}`
  }
  return area || city || provinceLabel(place)
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

  // Sin provincia cargada pero con un barrio de CABA (y sin pin que diga lo contrario).
  if (!province && area && isCabaBarrio(area) && coordsInCaba(place.location?.lat, place.location?.lng) !== false) {
    chunks.push("CABA")
  }

  return chunks.join(", ")
}
