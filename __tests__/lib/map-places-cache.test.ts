import {
  buildMapFilterKey,
  hasFreshViewportTile,
  MAP_CACHE_TTL_MS,
  MAP_MOVE_DEBOUNCE_MS,
  quantizeViewportTile,
  rememberViewportTile,
  writePlacesCache,
  mergeCachedPlaces,
  mergeIntoPlacesCache,
  getPlacesFromMemory,
  claimAdjacentPrefetch,
  hasFreshCompleteList,
  isCompletePlacesResponse,
  prefetchPlacesIfStale,
  readPlacesCache,
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

  it("mergeIntoPlacesCache une incoming en la misma key", async () => {
    await writePlacesCache("k1", [fakePlace("1", "A")])
    const merged = await mergeIntoPlacesCache("k1", [fakePlace("2", "B")])
    expect(merged.map((p) => String(p._id)).sort()).toEqual(["1", "2"])
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

/** IndexedDB mínimo (open / get / put) para probar la persistencia sin fake-indexeddb. */
function installFakeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>()
  const keyPaths = new Map<string, string>()
  const clone = <T,>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)))
  const db = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string, opts: { keyPath: string }) => {
      stores.set(name, new Map())
      keyPaths.set(name, opts.keyPath)
    },
    transaction: (name: string) => {
      const tx: { oncomplete?: () => void; objectStore: () => unknown } = {
        objectStore: () => ({
          get: (key: string) => {
            const req: { result?: unknown; onsuccess?: () => void } = {}
            setTimeout(() => {
              req.result = clone(stores.get(name)?.get(key))
              req.onsuccess?.()
            }, 0)
            return req
          },
          put: (value: Record<string, unknown>) => {
            stores.get(name)?.set(String(value[keyPaths.get(name) ?? ""]), clone(value))
            setTimeout(() => tx.oncomplete?.(), 0)
            return {}
          },
        }),
      }
      return tx
    },
  }
  const fake = {
    open: () => {
      const req: { result: typeof db; onupgradeneeded?: () => void; onsuccess?: () => void } = {
        result: db,
      }
      setTimeout(() => {
        if (stores.size === 0) req.onupgradeneeded?.()
        req.onsuccess?.()
      }, 0)
      return req
    },
  }
  ;(globalThis as { indexedDB?: unknown }).indexedDB = fake
  return {
    stores,
    uninstall: () => {
      delete (globalThis as { indexedDB?: unknown }).indexedDB
    },
  }
}

describe("lista completa (sin bbox)", () => {
  beforeEach(() => {
    _resetMapPlacesCacheForTests()
    jest.restoreAllMocks()
  })

  it("es completa sólo si total <= recibidos", () => {
    expect(isCompletePlacesResponse({ total: 2432 }, 2432)).toBe(true)
    expect(isCompletePlacesResponse({ total: 0 }, 0)).toBe(true)
    expect(isCompletePlacesResponse({ total: 6000 }, 5000)).toBe(false)
    expect(isCompletePlacesResponse(undefined, 10)).toBe(false)
  })

  it("marca puesta con total <= recibidos", async () => {
    const places = [fakePlace("1"), fakePlace("2")]
    await mergeIntoPlacesCache("k", places, {
      complete: isCompletePlacesResponse({ total: 2 }, places.length),
    })
    expect(hasFreshCompleteList("k")).toBe(true)
    expect(getPlacesFromMemory("k")?.complete).toBe(true)
  })

  it("marca no puesta con total > recibidos (y un fetch sin bbox incompleto la saca)", async () => {
    await mergeIntoPlacesCache("k", [fakePlace("1")], { complete: true })
    expect(hasFreshCompleteList("k")).toBe(true)
    await mergeIntoPlacesCache("k", [fakePlace("2")], {
      complete: isCompletePlacesResponse({ total: 6000 }, 1),
    })
    expect(hasFreshCompleteList("k")).toBe(false)
    expect(hasFreshCompleteList("otra")).toBe(false)
  })

  it("vence a los 8 minutos", async () => {
    await mergeIntoPlacesCache("k", [fakePlace("1")], { complete: true })
    const fetchedAt = getPlacesFromMemory("k")!.fetchedAt
    expect(hasFreshCompleteList("k", fetchedAt + MAP_CACHE_TTL_MS - 1)).toBe(true)
    expect(hasFreshCompleteList("k", fetchedAt + MAP_CACHE_TTL_MS)).toBe(false)
  })

  it("un merge por bbox no pisa la marca ni renueva su frescura", async () => {
    const t0 = 1_700_000_000_000
    const now = jest.spyOn(Date, "now").mockReturnValue(t0)
    await mergeIntoPlacesCache("k", [fakePlace("1")], { complete: true })
    now.mockReturnValue(t0 + 5 * 60 * 1000)
    const merged = await mergeIntoPlacesCache("k", [fakePlace("2")])
    expect(merged.map((p) => String(p._id)).sort()).toEqual(["1", "2"])
    const entry = getPlacesFromMemory("k")!
    expect(entry.complete).toBe(true)
    expect(entry.fetchedAt).toBe(t0)
    expect(hasFreshCompleteList("k", t0 + MAP_CACHE_TTL_MS)).toBe(false)
  })

  it("un merge por bbox no pone la marca", async () => {
    await mergeIntoPlacesCache("k", [fakePlace("1")])
    await mergeIntoPlacesCache("k", [fakePlace("2")])
    expect(getPlacesFromMemory("k")?.complete).toBeUndefined()
    expect(hasFreshCompleteList("k")).toBe(false)
  })

  it("se persiste en IndexedDB y cuenta como completa al leerla de ahí", async () => {
    const idb = installFakeIndexedDb()
    try {
      await mergeIntoPlacesCache("k", [fakePlace("1")], { complete: true })
      await writePlacesCache("legacy", [fakePlace("2")])
      expect(idb.stores.get("places-by-filter")?.get("k")).toMatchObject({ complete: true })

      _resetMapPlacesCacheForTests()
      expect(hasFreshCompleteList("k")).toBe(false)

      const fromDisk = await readPlacesCache("k")
      expect(fromDisk?.complete).toBe(true)
      expect(hasFreshCompleteList("k")).toBe(true)

      await readPlacesCache("legacy")
      expect(hasFreshCompleteList("legacy")).toBe(false)
    } finally {
      idb.uninstall()
    }
  })
})

describe("precarga de barrios vecinos: frescura y dedupe", () => {
  beforeEach(() => {
    _resetMapPlacesCacheForTests()
    jest.restoreAllMocks()
  })

  it("saltea una clave fresca en memoria", async () => {
    await writePlacesCache("k", [fakePlace("1")])
    const fetcher = jest.fn().mockResolvedValue(undefined)
    await prefetchPlacesIfStale("k", fetcher)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("saltea una clave fresca que sólo está en IndexedDB y la carga en memoria", async () => {
    const idb = installFakeIndexedDb()
    try {
      await writePlacesCache("k", [fakePlace("1")])
      _resetMapPlacesCacheForTests()
      const fetcher = jest.fn().mockResolvedValue(undefined)
      await prefetchPlacesIfStale("k", fetcher)
      expect(fetcher).not.toHaveBeenCalled()
      expect(getPlacesFromMemory("k")?.places).toHaveLength(1)
    } finally {
      idb.uninstall()
    }
  })

  it("pide si no hay caché o si venció (8 min)", async () => {
    const fetcher = jest.fn().mockResolvedValue(undefined)
    await prefetchPlacesIfStale("nueva", fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)

    const t0 = 1_700_000_000_000
    const now = jest.spyOn(Date, "now").mockReturnValue(t0)
    await writePlacesCache("vieja", [fakePlace("1")])
    now.mockReturnValue(t0 + MAP_CACHE_TTL_MS)
    const staleFetcher = jest.fn().mockResolvedValue(undefined)
    await prefetchPlacesIfStale("vieja", staleFetcher)
    expect(staleFetcher).toHaveBeenCalledTimes(1)
  })

  it("comparte el pedido en vuelo para la misma clave", async () => {
    let release: () => void = () => {}
    const fetcher = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    const a = prefetchPlacesIfStale("k", fetcher)
    const b = prefetchPlacesIfStale("k", fetcher)
    expect(b).toBe(a)
    await new Promise((r) => setTimeout(r, 0))
    release()
    await Promise.all([a, b])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("si el pedido falla, libera la clave y el siguiente reintenta", async () => {
    const failing = jest.fn().mockRejectedValue(new Error("red"))
    await expect(prefetchPlacesIfStale("k", failing)).rejects.toThrow("red")
    const retry = jest.fn().mockResolvedValue(undefined)
    await prefetchPlacesIfStale("k", retry)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("la precarga de vecinos se dispara una vez por clave hasta que vence", () => {
    const t0 = 1_700_000_000_000
    expect(claimAdjacentPrefetch("palermo", t0)).toBe(true)
    expect(claimAdjacentPrefetch("palermo", t0 + 1000)).toBe(false)
    expect(claimAdjacentPrefetch("recoleta", t0 + 1000)).toBe(true)
    expect(claimAdjacentPrefetch("palermo", t0 + MAP_CACHE_TTL_MS)).toBe(true)
  })
})

describe("prefetch barrios", () => {
  it("Palermo precarga Recoleta Belgrano Villa Crespo", () => {
    const next = getAdjacentNeighborhoods("Palermo")
    expect(next).toEqual(expect.arrayContaining(["Recoleta", "Belgrano", "Villa Crespo"]))
  })
})

describe("pin CeliMap", () => {
  it("gota + borde blanco + paleta de 3 colores", () => {
    const svg = celimapPinSvg({ fill: pinFillForSafety("dedicated_gf"), icon: "#FFFFFF" })
    expect(svg).toContain('stroke="#FFFFFF"')
    expect(svg).toContain("stroke-width=\"2\"")
    expect(svg).toContain('fill-opacity="0.95"')
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
