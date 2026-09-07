import { sortPlaces, listHasRatings, type PlaceWithListStats } from "@/components/map-view/place-sort"
import { formatListDistance } from "@/components/map-view/geo"

function place(partial: Partial<PlaceWithListStats> & { id: string; lat: number; lng: number }): PlaceWithListStats {
  return {
    _id: partial.id,
    name: partial.name ?? partial.id,
    location: { lat: partial.lat, lng: partial.lng },
    stats: partial.stats,
    googleSnapshot: partial.googleSnapshot,
  } as PlaceWithListStats
}

describe("place sort + distancia", () => {
  const origin = { lat: -34.6037, lng: -58.3816 }
  const near = place({ id: "near", name: "Cerca", lat: -34.604, lng: -58.382 })
  const far = place({ id: "far", name: "Lejos", lat: -34.62, lng: -58.45 })
  const rated = place({
    id: "rated",
    name: "Rated",
    lat: -34.61,
    lng: -58.4,
    stats: { avgRating: 4.8, totalReviews: 12 },
  })

  it("Más cercanos ordena por distancia real", () => {
    const sorted = sortPlaces([far, near, rated], "nearest", origin)
    expect(sorted.map((item) => String(item._id))).toEqual(["near", "rated", "far"])
  })

  it("sin ubicación nearest no inventa orden de distancia", () => {
    const sorted = sortPlaces([far, near], "nearest", null)
    expect(sorted.map((item) => String(item.name))).toEqual(["Cerca", "Lejos"])
  })

  it("Mejor valorados solo tiene sentido si hay rating", () => {
    expect(listHasRatings([near, far])).toBe(false)
    expect(listHasRatings([rated])).toBe(true)
    const sorted = sortPlaces([near, rated], "rating", null)
    expect(String(sorted[0]._id)).toBe("rated")
  })

  it("distancia usa a + coma es-AR", () => {
    expect(formatListDistance(350)).toBe("a 350 m")
    expect(formatListDistance(1200)).toBe("a 1,2 km")
  })
})
