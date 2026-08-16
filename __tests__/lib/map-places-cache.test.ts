import {
  buildMapFilterKey,
  hasFreshViewportTile,
  MAP_CACHE_TTL_MS,
  MAP_MOVE_DEBOUNCE_MS,
  quantizeViewportTile,
  rememberViewportTile,
  writePlacesCache,
  mergeCachedPlaces,
  getPlacesFromMemory,
  _resetMapPlacesCacheForTests,
  _viewportLruSize,
} from "@/lib/map-places-cache"
import { getAdjacentNeighborhoods } from "@/lib/map-neighborhood-graph"
import { celimapPinSvg, pinAssetPath, pinFillForSafety, pinImageId } from "@/lib/celimap-pin"
import { getPlaceImageUrl } from "@/lib/place-image"
import type { IPlace } from "@/models/Place"

function fakePlace(id: string, name = "Lugar"): IPlace {
  return {
    _id: id,
    name,
    location: { lng: -58.4, lat: -34.6 },
  } as unknown as IPlace
}

describe("map places cache", () => {
  beforeEach(() => {
    _resetMapPlacesCacheForTests()
  })

  it("TTL es 8 minutos y debounce 280ms", () => {
    expect(MAP_CACHE_TTL_MS).toBe(8 * 60 * 1000)
    expect(MAP_MOVE_DEBOUNCE_MS).toBe(280)
  })

  it("filter key estable con tags desordenados", () => {
    const a = buildMapFilterKey({ tags: ["b", "a"], neighborhood: "Palermo" })
    const b = buildMapFilterKey({ tags: ["a", "b"], neighborhood: "Palermo" })
    expect(a).toBe(b)
  })

  it("merge union por id", async () => {
    await writePlacesCache("k1", [fakePlace("1", "A"), fakePlace("2", "B")])
    await writePlacesCache("k2", [fakePlace("2", "B2"), fakePlace("3", "C")])
    const merged = mergeCachedPlaces(["k1", "k2"])
    expect(merged.map((p) => String(p._id)).sort()).toEqual(["1", "2", "3"])
    expect(getPlacesFromMemory("k1")?.places).toHaveLength(2)
  })

  it("LRU de viewport tiles no crece sin bound", () => {
    for (let i = 0; i < 40; i += 1) {
      rememberViewportTile(`tile-${i}`, ["a"])
    }
    expect(_viewportLruSize()).toBeLessThanOrEqual(24)
    expect(hasFreshViewportTile("tile-39")).toBe(true)
  })

  it("quantize viewport produce key con zoom", () => {
    const key = quantizeViewportTile(
      { west: -58.43, south: -34.59, east: -58.40, north: -34.56 },
      13
    )
    expect(key.split(":")).toHaveLength(5)
    expect(key.endsWith(":13")).toBe(true)
  })
})

describe("prefetch barrios", () => {
  it("Palermo precarga Recoleta Belgrano Villa Crespo", () => {
    const next = getAdjacentNeighborhoods("Palermo")
    expect(next).toEqual(expect.arrayContaining(["Recoleta", "Belgrano", "Villa Crespo"]))
  })
})

describe("pin CeliMap", () => {
  it("gota + borde cream + paleta de 3 colores", () => {
    const svg = celimapPinSvg({ fill: pinFillForSafety("dedicated_gf"), icon: "#FFFFFF" })
    expect(svg).toContain("#F6F1E8")
    expect(svg).toContain("stroke-width=\"1.5\"")
    expect(pinFillForSafety("dedicated_gf")).toBe("#1F4D35")
    expect(pinFillForSafety("gf_options")).toBe("#C85A2E")
    expect(pinFillForSafety("unknown")).toBe("#CFC9BF")
    expect(pinImageId("dedicated_gf")).toBe("celimap-pin-dedicated")
    expect(pinAssetPath("dedicated_gf")).toBe("/map/pin-dedicated.png")
    expect(pinAssetPath("gf_options")).toBe("/map/pin-options.png")
    expect(pinAssetPath("unknown")).toBeNull()
  })
})

describe("place image thumbs", () => {
  it("inyecta transform cloudinary solo una vez", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v1/celimap/photo.jpg"
    const thumb = getPlaceImageUrl(src, "thumb")
    expect(thumb).toContain("w_168")
    expect(getPlaceImageUrl(thumb, "thumb")).toBe(thumb)
  })
})
