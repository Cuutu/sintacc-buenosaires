import { ratingOf, shortCount } from "@/components/home/HomeFeaturedCard"
import type { PlaceWithStats } from "@/components/featured/featured-utils"

function place(extra: Partial<PlaceWithStats>): PlaceWithStats {
  return { _id: "p1", name: "TaccOff", type: "restaurant", neighborhood: "Palermo", ...extra }
}

describe("puntaje de los destacados: con cantidad al lado", () => {
  it("CeliMap primero, con la cantidad de reseñas", () => {
    const r = ratingOf(
      place({
        stats: { avgRating: 5, totalReviews: 3 },
        googleSnapshot: { rating: 4.6, userRatingCount: 1234 },
      })
    )
    expect(r).toEqual({ score: "5.0", detail: "3 reseñas", title: "5.0 de 5 en CeliMap, 3 reseñas" })
  })

  it("una sola reseña va en singular", () => {
    expect(ratingOf(place({ stats: { avgRating: 4, totalReviews: 1 } }))?.detail).toBe("1 reseña")
  })

  it("sin reseñas de CeliMap usa Google y dice de dónde sale", () => {
    const r = ratingOf(place({ googleSnapshot: { rating: 4.6, userRatingCount: 1234 } }))
    expect(r?.score).toBe("4.6")
    expect(r?.detail).toBe("1,2 mil en Google")
    expect(r?.title).toBe("4.6 de 5 en Google, 1.234 reseñas")
  })

  it("las cantidades grandes van cortas (la exacta queda en el title)", () => {
    expect(shortCount(812)).toBe("812")
    expect(shortCount(1000)).toBe("1 mil")
    expect(shortCount(1299)).toBe("1,2 mil")
    expect(shortCount(12345)).toBe("12 mil")
    expect(ratingOf(place({ googleSnapshot: { rating: 4.6, userRatingCount: 12345 } }))?.title).toBe(
      "4.6 de 5 en Google, 12.345 reseñas"
    )
  })

  it("Google sin cantidad muestra solo la fuente; sin nada, null", () => {
    expect(ratingOf(place({ googleSnapshot: { rating: 4.2 } }))?.detail).toBe("Google")
    expect(ratingOf(place({}))).toBeNull()
    expect(ratingOf(place({ stats: { avgRating: 0, totalReviews: 0 } }))).toBeNull()
  })
})
