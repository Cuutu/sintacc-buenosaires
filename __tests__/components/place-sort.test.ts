import {
  sortPlaces,
  listHasRatings,
  defaultSortForLocation,
  shouldShowLocationCta,
  shouldAskLocationForNearest,
  shouldFallbackNearestToRecommended,
  parseStoredSort,
  type PlaceWithListStats,
} from "@/components/map-view/place-sort"
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

  it("primeras 5 cards con mock coords van de cerca a lejos", () => {
    const extra = [
      place({ id: "a", name: "A", lat: -34.605, lng: -58.383 }),
      place({ id: "b", name: "B", lat: -34.61, lng: -58.39 }),
    ]
    const sorted = sortPlaces([far, extra[1], rated, extra[0], near], "nearest", origin)
    expect(sorted.slice(0, 5).map((item) => String(item._id))).toEqual([
      "near",
      "a",
      "b",
      "rated",
      "far",
    ])
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

  it("parseStoredSort ignora valores raros", () => {
    expect(parseStoredSort("nearest")).toBe("nearest")
    expect(parseStoredSort("nope")).toBeNull()
    expect(parseStoredSort(null)).toBeNull()
  })

  it("default Más cercanos solo si geolocation granted y no hay sort guardado", () => {
    expect(defaultSortForLocation("granted", null)).toBe("nearest")
    expect(defaultSortForLocation("prompt", null)).toBe("recommended")
    expect(defaultSortForLocation("denied", null)).toBe("recommended")
    expect(defaultSortForLocation("granted", "rating")).toBe("rating")
  })

  it("CTA de ubicación aparece en Recomendados sin coords", () => {
    expect(
      shouldShowLocationCta({ sort: "recommended", status: "prompt", hasCoords: false })
    ).toBe(true)
    expect(
      shouldShowLocationCta({ sort: "recommended", status: "prompt", hasCoords: true })
    ).toBe(false)
    expect(
      shouldShowLocationCta({ sort: "recommended", status: "denied", hasCoords: false })
    ).toBe(false)
  })

  it("nearest pide ubicación solo sin coords; fallback solo tras deny/error", () => {
    expect(shouldAskLocationForNearest({ sort: "nearest", hasCoords: false })).toBe(true)
    expect(shouldAskLocationForNearest({ sort: "nearest", hasCoords: true })).toBe(false)
    expect(shouldAskLocationForNearest({ sort: "recommended", hasCoords: false })).toBe(false)
    expect(
      shouldFallbackNearestToRecommended({
        sort: "nearest",
        status: "prompt",
        hasCoords: false,
      })
    ).toBe(false)
    expect(
      shouldFallbackNearestToRecommended({
        sort: "nearest",
        status: "denied",
        hasCoords: false,
      })
    ).toBe(true)
    expect(
      shouldFallbackNearestToRecommended({
        sort: "nearest",
        status: "denied",
        hasCoords: true,
      })
    ).toBe(false)
  })

  it("desktop y mobile usan el mismo hook; pedir GPS en setSort no en effect", () => {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")
    const desktop = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapDesktop.tsx"),
      "utf8"
    )
    const mobile = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapMobile.tsx"),
      "utf8"
    )
    const hook = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/useMapPlaceSort.ts"),
      "utf8"
    )
    expect(desktop).toContain("useMapPlaceSort")
    expect(mobile).toContain("useMapPlaceSort")
    expect(desktop).not.toContain("sortInitializedRef")
    expect(mobile).not.toContain("sortInitializedRef")
    expect(desktop).toContain("LOCATION_SORT_CTA")
    expect(mobile).toContain("LOCATION_SORT_CTA")
    expect(hook).toContain("shouldAskLocationForNearest")
    expect(hook).toContain("requestLocation()")
    expect(hook).not.toContain("askedForNearestRef")
    const loc = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/useUserLocation.ts"),
      "utf8"
    )
    expect(loc).toContain("No pudimos usar tu ubicación")
  })
})
