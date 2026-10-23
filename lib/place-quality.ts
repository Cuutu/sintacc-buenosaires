import { inferSafetyLevel } from "@/components/featured/featured-utils"

/**
 * Puntaje de "Recomendados" (mapa) y orden de las páginas por tipo: primero las fichas
 * con foto, completas y bien puntuadas. Va de 0 a 100. Antes "Recomendados" era
 * 100% sin TACC + orden alfabético (revisión 23/10).
 *
 * Función pura: sirve en el cliente (mapa) y en el servidor (landings), así los dos
 * ordenan igual. Lo que no viene en el listado del mapa (contacto) simplemente no suma.
 */
export type PlaceQualityInput = {
  name?: string | null
  photos?: unknown[] | null
  address?: string | null
  addressText?: string | null
  openingHours?: string | null
  neighborhood?: string | null
  locality?: string | null
  contact?: { instagram?: string | null; phone?: string | null; whatsapp?: string | null; url?: string | null } | null
  googleSnapshot?: { rating?: number | null; userRatingCount?: number | null } | null
  stats?: { avgRating?: number | null; totalReviews?: number | null } | null
  tags?: string[] | null
  safetyLevel?: string | null
}

export const PLACE_QUALITY_WEIGHTS = {
  /** Lo que más pesa: una ficha sin foto casi no se toca. */
  photo: 30,
  /** Completitud. */
  address: 8,
  hours: 12,
  area: 5,
  contact: 5,
  /** Puntaje (bayesiano: 4,9 con 2 reseñas no le gana a 4,6 con 300). */
  rating: 25,
  /** Cantidad de reseñas, en escala logarítmica. */
  reviews: 10,
  /** Un empujón chico a lo 100% sin TACC (antes era lo único que ordenaba). */
  safety: 5,
} as const

/** Puntaje que se asume para un lugar sin reseñas, y cuántas reseñas "vale" esa suposición. */
const PRIOR_RATING = 4
const PRIOR_WEIGHT = 5
/** Con esta cantidad de reseñas (o más) suma todo lo de `reviews`. */
const REVIEWS_FOR_FULL = 500
/** Una reseña de la comunidad vale más que una de Google para este puntaje. */
const CELIMAP_REVIEW_WEIGHT = 5

function hasText(value: unknown, min = 3): boolean {
  return typeof value === "string" && value.trim().length >= min
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** Puntaje y cantidad que se usan: los de CeliMap si hay reseñas; si no, los de Google. */
function ratingSource(place: PlaceQualityInput): { rating: number; count: number; weighted: number } {
  const celiCount = place.stats?.totalReviews ?? 0
  const googleCount = place.googleSnapshot?.userRatingCount ?? 0
  const weighted = celiCount * CELIMAP_REVIEW_WEIGHT + googleCount
  if (celiCount > 0) return { rating: place.stats?.avgRating ?? 0, count: celiCount, weighted }
  const googleRating = place.googleSnapshot?.rating ?? 0
  if (googleRating > 0) return { rating: googleRating, count: googleCount, weighted }
  return { rating: 0, count: 0, weighted }
}

export function placeQualityScore(place: PlaceQualityInput): number {
  const w = PLACE_QUALITY_WEIGHTS
  let score = 0

  const firstPhoto = place.photos?.[0]
  if (typeof firstPhoto === "string" && firstPhoto.trim()) score += w.photo

  if (hasText(place.address, 5) || hasText(place.addressText, 5)) score += w.address
  if (hasText(place.openingHours, 5)) score += w.hours
  if (hasText(place.neighborhood, 2) || hasText(place.locality, 2)) score += w.area
  const c = place.contact
  if (c && (hasText(c.instagram) || hasText(c.phone) || hasText(c.whatsapp) || hasText(c.url))) score += w.contact

  const { rating, count, weighted } = ratingSource(place)
  if (rating > 0) {
    const bayes = (rating * count + PRIOR_RATING * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT)
    // 3 o menos no suma; 5 suma todo.
    score += w.rating * clamp01((bayes - 3) / 2)
  }
  if (weighted > 0) {
    score += w.reviews * clamp01(Math.log10(1 + weighted) / Math.log10(1 + REVIEWS_FOR_FULL))
  }

  const level = inferSafetyLevel({ tags: place.tags ?? undefined, safetyLevel: (place.safetyLevel ?? undefined) as never })
  if (level === "dedicated_gf") score += w.safety
  else if (level === "gf_options") score += w.safety * 0.6

  return Math.round(score * 100) / 100
}

const NAME_COLLATOR = new Intl.Collator("es", { sensitivity: "base" })

/**
 * Ordena de mejor a peor puntaje; a igual puntaje, por nombre. No modifica el array.
 * Calcula el puntaje una vez por lugar (no en cada comparación).
 */
export function sortByPlaceQuality<T extends PlaceQualityInput & { name?: string }>(places: T[]): T[] {
  return places
    .map((place) => ({ place, score: placeQualityScore(place), name: place.name ?? "" }))
    .sort((a, b) => b.score - a.score || NAME_COLLATOR.compare(a.name, b.name))
    .map((entry) => entry.place)
}
