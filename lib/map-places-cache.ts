import type { IPlace } from "@/models/Place"
import type { MapViewportBounds } from "@/components/map-view/geo"

export const MAP_CACHE_TTL_MS = 8 * 60 * 1000
export const MAP_MOVE_DEBOUNCE_MS = 280
const LRU_MAX_TILES = 24
const IDB_NAME = "celimap-map"
const IDB_VERSION = 1
const STORE_PLACES = "places-by-filter"
const STORE_TILES = "viewport-tiles"

export type CachedPlacesEntry = {
  filterKey: string
  places: IPlace[]
  fetchedAt: number
}

type TileEntry = {
  tileKey: string
  ids: string[]
  fetchedAt: number
}

class LruMap<V> {
  private readonly map = new Map<string, V>()

  constructor(private readonly max: number) {}

  get(key: string): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value
      if (oldest == null) break
      this.map.delete(oldest)
    }
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  keys(): string[] {
    return [...this.map.keys()]
  }
}

const memoryPlaces = new Map<string, CachedPlacesEntry>()
const memoryTiles = new LruMap<TileEntry>(LRU_MAX_TILES)

function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < MAP_CACHE_TTL_MS
}

export function buildMapFilterKey(input: {
  citySlugs?: string
  provinceSlugs?: string
  localitySlugs?: string
  search?: string
  type?: string
  neighborhood?: string
  tags?: string[]
  safetyLevel?: string
}): string {
  return JSON.stringify({
    citySlugs: input.citySlugs ?? "",
    provinceSlugs: input.provinceSlugs ?? "",
    localitySlugs: input.localitySlugs ?? "",
    search: input.search ?? "",
    type: input.type ?? "",
    neighborhood: input.neighborhood ?? "",
    tags: [...(input.tags ?? [])].sort(),
    safetyLevel: input.safetyLevel ?? "",
  })
}

export function quantizeViewportTile(
  bounds: MapViewportBounds,
  zoom: number
): string {
  const step = zoom >= 14 ? 0.008 : zoom >= 12 ? 0.02 : 0.05
  const q = (n: number) => Math.floor(n / step) * step
  return [q(bounds.west), q(bounds.south), q(bounds.east), q(bounds.north), Math.floor(zoom)].join(
    ":"
  )
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_PLACES)) {
          db.createObjectStore(STORE_PLACES, { keyPath: "filterKey" })
        }
        if (!db.objectStoreNames.contains(STORE_TILES)) {
          db.createObjectStore(STORE_TILES, { keyPath: "tileKey" })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined)
        try {
          const tx = db.transaction(store, "readonly")
          const req = tx.objectStore(store).get(key)
          req.onsuccess = () => resolve(req.result as T | undefined)
          req.onerror = () => resolve(undefined)
        } catch {
          resolve(undefined)
        }
      })
  )
}

function idbPut(store: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve()
        try {
          const tx = db.transaction(store, "readwrite")
          tx.objectStore(store).put(value)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      })
  )
}

export function getPlacesFromMemory(filterKey: string): CachedPlacesEntry | null {
  const entry = memoryPlaces.get(filterKey)
  if (!entry) return null
  return entry
}

export function isPlacesCacheFresh(filterKey: string, now = Date.now()): boolean {
  const entry = memoryPlaces.get(filterKey)
  return Boolean(entry && isFresh(entry.fetchedAt, now))
}

export async function readPlacesCache(filterKey: string): Promise<CachedPlacesEntry | null> {
  const mem = memoryPlaces.get(filterKey)
  if (mem) return mem
  const disk = await idbGet<CachedPlacesEntry>(STORE_PLACES, filterKey)
  if (!disk?.places) return null
  memoryPlaces.set(filterKey, disk)
  return disk
}

export async function writePlacesCache(filterKey: string, places: IPlace[]): Promise<void> {
  const entry: CachedPlacesEntry = {
    filterKey,
    places,
    fetchedAt: Date.now(),
  }
  memoryPlaces.set(filterKey, entry)
  await idbPut(STORE_PLACES, entry)
}

export function mergeCachedPlaces(keys: string[]): IPlace[] {
  const byId = new Map<string, IPlace>()
  for (const key of keys) {
    const entry = memoryPlaces.get(key)
    if (!entry) continue
    for (const place of entry.places) {
      const id = place._id != null ? String(place._id) : ""
      if (id) byId.set(id, place)
    }
  }
  return [...byId.values()]
}

export function rememberViewportTile(
  tileKey: string,
  ids: string[],
  now = Date.now()
): void {
  const entry: TileEntry = { tileKey, ids, fetchedAt: now }
  memoryTiles.set(tileKey, entry)
  void idbPut(STORE_TILES, entry)
}

export function hasFreshViewportTile(tileKey: string, now = Date.now()): boolean {
  const entry = memoryTiles.get(tileKey)
  return Boolean(entry && isFresh(entry.fetchedAt, now))
}

/** Exportado para tests del LRU. */
export function _viewportLruSize(): number {
  return memoryTiles.keys().length
}

export function _resetMapPlacesCacheForTests(): void {
  memoryPlaces.clear()
  memoryTiles.clear()
}
