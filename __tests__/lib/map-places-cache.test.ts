import {
  buildMapFilterKey,
  boundsContain,
  estimateViewportBounds,
  isViewportCovered,
  MAP_CACHE_TTL_MS,
  MAP_MOVE_DEBOUNCE_MS,
  persistPlacesCache,
  rememberCompleteViewport,
  snapViewportToGrid,
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

  it("la grilla redondea hacia afuera y un paneo chico da la misma celda", () => {
    const a = snapViewportToGrid({ west: -58.431, south: -34.612, east: -58.372, north: -34.561 }, 13.4)
    const b = snapViewportToGrid({ west: -58.43, south: -34.6115, east: -58.373, north: -34.5615 }, 13.2)
    expect(a).toEqual(b)
    expect(boundsContain(a, { west: -58.431, south: -34.612, east: -58.372, north: -34.561 })).toBe(true)
    // Más zoom → celdas más chicas
    const fine = snapViewportToGrid({ west: -58.431, south: -34.612, east: -58.372, north: -34.561 }, 16)
    expect(fine.east - fine.west).toBeLessThan(a.east - a.west)
  })

  it("una zona traída entera cubre las de adentro (zoom in) y no las más grandes", () => {
    const k = buildMapFilterKey({})
    const zone = { west: -58.45, south: -34.65, east: -58.35, north: -34.55 }
    rememberCompleteViewport(k, zone)
    expect(isViewportCovered(k, { west: -58.42, south: -34.62, east: -58.38, north: -34.58 })).toBe(true)
    expect(isViewportCovered(k, { west: -58.5, south: -34.7, east: -58.3, north: -34.5 })).toBe(false)
    expect(isViewportCovered(buildMapFilterKey({ type: "cafe" }), zone)).toBe(false)
  })

  it("dos zonas que se pisan cubren lo que queda entre las dos", () => {
    const k = "k"
    rememberCompleteViewport(k, { west: -58.5, south: -34.7, east: -58.4, north: -34.6 })
    rememberCompleteViewport(k, { west: -58.42, south: -34.7, east: -58.3, north: -34.6 })
    expect(isViewportCovered(k, { west: -58.45, south: -34.68, east: -58.35, north: -34.62 })).toBe(true)
    // Se sale por arriba
    expect(isViewportCovered(k, { west: -58.45, south: -34.68, east: -58.35, north: -34.58 })).toBe(false)
  })

  it("estima el área de CABA a zoom 12 en un celular como la calcula Mapbox", () => {
    const b = estimateViewportBounds([-58.3816, -34.6037], 12, 390, 844)
    // 390 px de ancho a zoom 12 = 390 / (512 · 2^12) · 360° ≈ 0,0669°
    expect(b.east - b.west).toBeCloseTo(0.06695, 4)
    expect((b.east + b.west) / 2).toBeCloseTo(-58.3816, 4)
    expect(b.north).toBeGreaterThan(-34.6037)
    expect(b.south).toBeLessThan(-34.6037)
    // A esa latitud el alto en grados es menor que 844/390 veces el ancho
    expect(b.north - b.south).toBeLessThan((b.east - b.west) * (844 / 390))
  })

  it("la cobertura vence con el caché (8 minutos)", () => {
    const zone = { west: -58.45, south: -34.65, east: -58.35, north: -34.55 }
    rememberCompleteViewport("k", zone, 1_000)
    expect(isViewportCovered("k", zone, 1_000 + MAP_CACHE_TTL_MS - 1)).toBe(true)
    expect(isViewportCovered("k", zone, 1_000 + MAP_CACHE_TTL_MS)).toBe(false)
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

describe("IndexedDB: una conexión y una escritura por filtro", () => {
  beforeEach(() => {
    _resetMapPlacesCacheForTests()
  })

  it("abre la base una sola vez", async () => {
    const idb = installFakeIndexedDb()
    const fake = (globalThis as { indexedDB: { open: (...args: unknown[]) => unknown } }).indexedDB
    const open = jest.spyOn(fake, "open")
    try {
      await writePlacesCache("a", [fakePlace("1")])
      await writePlacesCache("b", [fakePlace("2")])
      await readPlacesCache("c")
      expect(open).toHaveBeenCalledTimes(1)
    } finally {
      idb.uninstall()
    }
  })

  it("con persist: false junta en memoria y persistPlacesCache escribe una vez", async () => {
    const idb = installFakeIndexedDb()
    try {
      await mergeIntoPlacesCache("k", [fakePlace("1")], { persist: false })
      await mergeIntoPlacesCache("k", [fakePlace("2")], { persist: false })
      expect(idb.stores.get("places-by-filter")?.get("k")).toBeUndefined()
      expect(getPlacesFromMemory("k")?.places).toHaveLength(2)
      await persistPlacesCache("k")
      expect((idb.stores.get("places-by-filter")?.get("k") as { places: unknown[] }).places).toHaveLength(2)
    } finally {
      idb.uninstall()
    }
  })
})
