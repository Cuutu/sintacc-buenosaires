export type PlaceReviewSource = {
  stats?: { avgRating?: number; totalReviews?: number } | null
  googleSnapshot?: { rating?: number; userRatingCount?: number } | null
}

export type PlaceReviewLine = {
  kind: "google" | "community"
  text: string
  hasScore: boolean
}

export type EmptyCommunityMode = "always" | "when-google" | "never"

/**
 * Google and CeliMap as separate labeled lines. Never invent scores.
 * Empty community copy always says "de la comunidad" so it cannot
 * contradict a Google rating on the same card.
 */
export function getPlaceReviewLines(
  place: PlaceReviewSource,
  options?: { emptyCommunity?: EmptyCommunityMode }
): PlaceReviewLine[] {
  const emptyCommunity = options?.emptyCommunity ?? "when-google"
  const lines: PlaceReviewLine[] = []

  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount
  const hasGoogle = googleRating != null || (googleCount != null && googleCount > 0)

  if (googleRating != null) {
    const countBit =
      googleCount != null
        ? ` · ${googleCount.toLocaleString("es-AR")} reseña${googleCount === 1 ? "" : "s"}`
        : ""
    lines.push({
      kind: "google",
      text: `Google ${googleRating.toFixed(1)}${countBit}`,
      hasScore: true,
    })
  } else if (googleCount != null && googleCount > 0) {
    lines.push({
      kind: "google",
      text: `Google · ${googleCount.toLocaleString("es-AR")} reseñas`,
      hasScore: false,
    })
  }

  const totalReviews = place.stats?.totalReviews ?? 0
  const avgRating = place.stats?.avgRating ?? 0
  if (totalReviews > 0 && avgRating > 0) {
    lines.push({
      kind: "community",
      text: `CeliMap ${avgRating.toFixed(1)} · ${totalReviews} reseña${totalReviews === 1 ? "" : "s"}`,
      hasScore: true,
    })
  } else if (
    emptyCommunity === "always" ||
    (emptyCommunity === "when-google" && hasGoogle)
  ) {
    lines.push({
      kind: "community",
      text: "Todavía no hay reseñas de la comunidad",
      hasScore: false,
    })
  }

  return lines
}
