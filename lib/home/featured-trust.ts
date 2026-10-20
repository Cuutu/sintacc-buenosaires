import { inferSafetyLevel, type PlaceWithStats } from "@/components/featured/featured-utils"

/**
 * Qué tanto respaldo tiene un lugar para salir en "Lugares destacados" (revisión 20/10:
 * Lele sin reseñas y TaccOff con una sola, en una sección que vende confianza). Sin
 * dependencias de servidor: lo usan la home, su respaldo en el cliente y el admin.
 */
export const FEATURED_TRUST = {
  /** Reseñas de CeliMap para que su puntaje cuente solo. */
  minCelimapReviews: 3,
  /** Reseñas de Google para que su puntaje cuente. */
  minGoogleReviews: 50,
  /** Puntaje mínimo (de la fuente que se muestra). */
  minRating: 4,
} as const

type TrustInput = Pick<PlaceWithStats, "tags" | "safetyLevel" | "stats" | "googleSnapshot">

export type ShownRating = { source: "celimap" | "google"; score: number; count: number }

/**
 * El puntaje que muestra la tarjeta. CeliMap si tiene 3 reseñas o más (o si Google no
 * tiene puntaje); si tiene menos, el de Google cuando Google tiene más reseñas. Así no
 * aparece "5.0 · 1 reseña" al lado de un lugar con cientos de reseñas en Google.
 */
export function shownRating(place: TrustInput): ShownRating | null {
  const localAvg = place.stats?.avgRating ?? 0
  const localCount = place.stats?.totalReviews ?? 0
  const local = localAvg > 0 && localCount > 0 ? { source: "celimap" as const, score: localAvg, count: localCount } : null
  const googleRating = place.googleSnapshot?.rating ?? 0
  const google =
    googleRating > 0
      ? { source: "google" as const, score: googleRating, count: place.googleSnapshot?.userRatingCount ?? 0 }
      : null

  if (local && (local.count >= FEATURED_TRUST.minCelimapReviews || !google)) return local
  if (google && (!local || google.count > local.count)) return google
  return local
}

export type FeaturedTrust =
  /** Tiene reseñas suficientes y buen puntaje: va primero. */
  | "backed"
  /** Pocas reseñas: va después de los que tienen respaldo. */
  | "few_reviews"
  /** Reseñas suficientes pero puntaje bajo: va al final. */
  | "low_rating"
  /** Tiene reportes de contaminación visibles: no sale. */
  | "reports"
  /** No es 100% sin TACC: no sale. */
  | "not_dedicated"

export function featuredTrust(place: TrustInput): FeaturedTrust {
  if (inferSafetyLevel(place) !== "dedicated_gf") return "not_dedicated"
  if ((place.stats?.contaminationReportsCount ?? 0) > 0) return "reports"
  const rating = shownRating(place)
  if (!rating) return "few_reviews"
  const enough =
    rating.source === "celimap"
      ? rating.count >= FEATURED_TRUST.minCelimapReviews
      : rating.count >= FEATURED_TRUST.minGoogleReviews
  if (!enough) return "few_reviews"
  return rating.score >= FEATURED_TRUST.minRating ? "backed" : "low_rating"
}

const TIER: Record<FeaturedTrust, number> = {
  backed: 0,
  few_reviews: 1,
  low_rating: 2,
  reports: 9,
  not_dedicated: 9,
}

/** Una reseña de CeliMap (de alguien celíaco) pesa como 25 de Google. */
export function reviewWeight(place: TrustInput): number {
  return (place.stats?.totalReviews ?? 0) * 25 + (place.googleSnapshot?.userRatingCount ?? 0)
}

export type FeaturedCandidate = PlaceWithStats & { featured?: boolean; featuredOrder?: number | null }

/**
 * Orden de los destacados: primero los que tienen respaldo, después los de pocas
 * reseñas y al final los de puntaje bajo; nunca los que no son 100% ni los que tienen
 * reportes. Dentro de cada grupo: los elegidos en el admin (en su orden), después los
 * que tienen foto y después los que tienen más reseñas.
 */
export function rankFeaturedCandidates<T extends FeaturedCandidate>(candidates: T[]): T[] {
  return candidates
    .map((place, index) => ({ place, index, tier: TIER[featuredTrust(place)] }))
    .filter((row) => row.tier < TIER.reports)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        Number(Boolean(b.place.featured)) - Number(Boolean(a.place.featured)) ||
        (a.place.featured && b.place.featured ? (a.place.featuredOrder ?? 99) - (b.place.featuredOrder ?? 99) : 0) ||
        Number(Boolean(b.place.photos?.length)) - Number(Boolean(a.place.photos?.length)) ||
        reviewWeight(b.place) - reviewWeight(a.place) ||
        a.index - b.index
    )
    .map((row) => row.place)
}

/** Para el admin: qué pasa con este destacado en la home. null si sale sin problema. */
export function featuredTrustNote(place: TrustInput): string | null {
  switch (featuredTrust(place)) {
    case "not_dedicated":
      return "No es 100% sin TACC: no aparece en la home."
    case "reports":
      return "Tiene reportes de contaminación: no aparece en la home."
    case "few_reviews":
      return `Pocas reseñas (menos de ${FEATURED_TRUST.minCelimapReviews} en CeliMap y de ${FEATURED_TRUST.minGoogleReviews} en Google): en la home va después de los que tienen más.`
    case "low_rating":
      return `Puntaje menor a ${FEATURED_TRUST.minRating}: en la home va al final.`
    default:
      return null
  }
}
