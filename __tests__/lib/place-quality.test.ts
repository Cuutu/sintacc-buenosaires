/**
 * @jest-environment node
 */
import { placeQualityScore, sortByPlaceQuality } from "@/lib/place-quality"
import { sortPlaces } from "@/components/map-view/place-sort"

const full = {
  name: "Completo",
  photos: ["https://res.cloudinary.com/x/a.jpg"],
  address: "Gorriti 4800",
  openingHours: "Lun–Vie 09:00–20:00",
  neighborhood: "Palermo",
  contact: { instagram: "@completo" },
  googleSnapshot: { rating: 4.6, userRatingCount: 300 },
  tags: ["opciones_sin_tacc"],
}

describe("placeQualityScore", () => {
  it("la foto es lo que más pesa", () => {
    const sinFoto = { ...full, photos: [] }
    expect(placeQualityScore(full) - placeQualityScore(sinFoto)).toBe(30)
  })

  it("rating bayesiano: 4,9 con 2 reseñas no le gana a 4,6 con 300", () => {
    const pocas = { ...full, googleSnapshot: { rating: 4.9, userRatingCount: 2 } }
    expect(placeQualityScore(full)).toBeGreaterThan(placeQualityScore(pocas))
  })

  it("las reseñas de CeliMap mandan sobre Google", () => {
    const malaCeli = { ...full, stats: { avgRating: 2, totalReviews: 10 } }
    expect(placeQualityScore(malaCeli)).toBeLessThan(placeQualityScore(full))
  })

  it("100% sin TACC suma poco: no le gana a una ficha completa con foto", () => {
    const dedicadoVacio = { name: "A", tags: ["100_gf"] }
    expect(placeQualityScore(dedicadoVacio)).toBeLessThan(placeQualityScore(full))
    expect(placeQualityScore({ name: "B", tags: ["100_gf"] })).toBe(5)
  })

  it("una ficha vacía da 0 y nunca pasa de 100", () => {
    expect(placeQualityScore({})).toBe(0)
    const max = { ...full, tags: ["100_gf"], googleSnapshot: { rating: 5, userRatingCount: 5000 } }
    expect(placeQualityScore(max)).toBeLessThanOrEqual(100)
  })
})

describe("orden", () => {
  it("sortByPlaceQuality: mejor puntaje arriba y, a igual puntaje, por nombre", () => {
    const places = [
      { name: "Zeta" },
      { ...full, name: "Medio", photos: [] },
      { ...full, name: "Arriba" },
      { name: "Alfa" },
    ]
    expect(sortByPlaceQuality(places).map((p) => p.name)).toEqual(["Arriba", "Medio", "Alfa", "Zeta"])
  })

  it("Recomendados del mapa ya no es 100% + alfabético", () => {
    const dedicadoSinNada = { _id: "1", name: "Aaa 100%", tags: ["100_gf"] } as never
    const completo = { _id: "2", ...full, name: "Zzz completo" } as never
    const sorted = sortPlaces([dedicadoSinNada, completo], "recommended", null)
    expect(sorted.map((p: { name: string }) => p.name)).toEqual(["Zzz completo", "Aaa 100%"])
  })
})
