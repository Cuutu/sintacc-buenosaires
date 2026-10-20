/**
 * @jest-environment node
 */
import {
  featuredTrust,
  featuredTrustNote,
  rankFeaturedCandidates,
  reviewWeight,
  shownRating,
  type FeaturedCandidate,
} from "@/lib/home/featured-trust"

function place(id: string, extra: Partial<FeaturedCandidate> = {}): FeaturedCandidate {
  return {
    _id: id,
    name: id,
    type: "restaurant",
    neighborhood: "Palermo",
    tags: ["100_gf"],
    photos: ["https://res.cloudinary.com/x/p.jpg"],
    ...extra,
  }
}

const celimap = (avgRating: number, totalReviews: number, contaminationReportsCount = 0) => ({
  stats: { avgRating, totalReviews, contaminationReportsCount },
})
const google = (rating: number, userRatingCount?: number) => ({ googleSnapshot: { rating, userRatingCount } })

describe("puntaje que muestra la tarjeta", () => {
  it("CeliMap con 3 reseñas o más, aunque Google tenga muchas", () => {
    expect(shownRating(place("a", { ...celimap(4.7, 3), ...google(4.2, 900) }))).toEqual({
      source: "celimap",
      score: 4.7,
      count: 3,
    })
  })

  it("con 1 o 2 reseñas en CeliMap, Google si tiene más (TaccOff ya no dice 5.0 · 1 reseña)", () => {
    expect(shownRating(place("a", { ...celimap(5, 1), ...google(4.6, 300) }))?.source).toBe("google")
    expect(shownRating(place("a", celimap(5, 1)))?.source).toBe("celimap")
    expect(shownRating(place("a", { ...celimap(5, 2), ...google(4.6) }))?.source).toBe("celimap")
    expect(shownRating(place("a"))).toBeNull()
  })
})

describe("respaldo para salir en destacados", () => {
  it("con respaldo: 3+ reseñas en CeliMap o 50+ en Google, y puntaje 4 o más", () => {
    expect(featuredTrust(place("a", celimap(4.5, 3)))).toBe("backed")
    expect(featuredTrust(place("a", google(4.5, 50)))).toBe("backed")
    expect(featuredTrust(place("a", { ...celimap(5, 1), ...google(4.4, 120) }))).toBe("backed")
  })

  it("pocas reseñas: Lele (ninguna), TaccOff (una sola) o Google con 49", () => {
    expect(featuredTrust(place("lele"))).toBe("few_reviews")
    expect(featuredTrust(place("taccoff", celimap(5, 1)))).toBe("few_reviews")
    expect(featuredTrust(place("a", google(4.8, 49)))).toBe("few_reviews")
  })

  it("puntaje bajo, reportes de contaminación y lugares que no son 100%", () => {
    expect(featuredTrust(place("a", celimap(3.6, 8)))).toBe("low_rating")
    expect(featuredTrust(place("a", celimap(4.9, 8, 1)))).toBe("reports")
    expect(featuredTrust(place("a", { tags: ["opciones_sin_tacc"], ...celimap(4.9, 8) }))).toBe("not_dedicated")
  })

  it("el admin ve qué pasa con cada destacado", () => {
    expect(featuredTrustNote(place("a", celimap(4.5, 5)))).toBeNull()
    expect(featuredTrustNote(place("lele"))).toMatch(/^Pocas reseñas/)
    expect(featuredTrustNote(place("a", celimap(4.9, 8, 2)))).toMatch(/reportes de contaminación/)
    expect(featuredTrustNote(place("a", { tags: ["opciones_sin_tacc"] }))).toMatch(/No es 100%/)
  })
})

describe("orden de los destacados", () => {
  it("primero con respaldo (los del admin en su orden), después pocas reseñas; sin reportes", () => {
    const ranked = rankFeaturedCandidates([
      place("lele", { featured: true, featuredOrder: 0 }),
      place("taccoff", { featured: true, featuredOrder: 1, ...celimap(5, 1) }),
      place("amitie", { featured: true, featuredOrder: 2, ...google(4.5, 857) }),
      place("fry", { ...google(4.3, 210) }),
      place("comunidad", { ...celimap(4.8, 12) }),
      place("reportado", { featured: true, featuredOrder: 3, ...celimap(4.9, 20, 1) }),
      place("baja", { ...celimap(3.5, 9) }),
    ])
    expect(ranked.map((p) => p.name)).toEqual(["amitie", "comunidad", "fry", "lele", "taccoff", "baja"])
  })

  it("dentro del grupo: con foto antes que sin foto; una reseña de CeliMap pesa como 25 de Google", () => {
    expect(reviewWeight(place("a", { ...celimap(4.5, 4), ...google(4.4, 60) }))).toBe(160)
    const ranked = rankFeaturedCandidates([
      place("sinfoto", { photos: [], ...celimap(4.9, 30) }),
      place("google", google(4.5, 120)),
      place("celimap", celimap(4.6, 6)),
    ])
    expect(ranked.map((p) => p.name)).toEqual(["celimap", "google", "sinfoto"])
  })
})
