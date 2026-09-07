import { getPlaceReviewLines } from "@/lib/place-review-display"

describe("reseñas Google vs CeliMap", () => {
  it("0 comunidad + Google: ambas líneas, sin empty genérico", () => {
    const lines = getPlaceReviewLines(
      {
        stats: { avgRating: 0, totalReviews: 0 },
        googleSnapshot: { rating: 4.8, userRatingCount: 68 },
      },
      { emptyCommunity: "always" }
    )
    expect(lines.map((line) => line.text)).toEqual([
      "Google 4.8 · 68 reseñas",
      "Todavía no hay reseñas de la comunidad",
    ])
    expect(lines.some((line) => line.text === "Todavía no hay reseñas")).toBe(false)
  })

  it("ficha: empty comunidad solo si hay Google", () => {
    const withGoogle = getPlaceReviewLines({
      googleSnapshot: { rating: 4.8, userRatingCount: 68 },
    })
    expect(withGoogle.map((line) => line.text)).toEqual([
      "Google 4.8 · 68 reseñas",
      "Todavía no hay reseñas de la comunidad",
    ])

    const without = getPlaceReviewLines({ stats: { avgRating: 0, totalReviews: 0 } })
    expect(without).toEqual([])
  })

  it("no inventa rating: comunidad gana su línea aparte", () => {
    const lines = getPlaceReviewLines({
      stats: { avgRating: 4.2, totalReviews: 3 },
      googleSnapshot: { rating: 4.8, userRatingCount: 68 },
    })
    expect(lines.map((line) => line.text)).toEqual([
      "Google 4.8 · 68 reseñas",
      "CeliMap 4.2 · 3 reseñas",
    ])
  })
})
