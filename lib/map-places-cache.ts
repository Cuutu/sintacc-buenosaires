import type { IPlace } from "@/models/Place"
import type { MapViewportBounds } from "@/components/map-view/geo"

export const MAP_CACHE_TTL_MS = 8 * 60 * 1000
export const MAP_MOVE_DEBOUNCE_MS = 280
const IDB_NAME = "celimap-map"
const IDB_VERSION = 1
const STORE_PLACES = "places-by-filter"
/** Ya no se usa (era el LRU de tiles); se sigue creando para no cambiar la versión de la base. */
const STORE_TILES = "viewport-tiles"

export type CachedPlacesEntry = {
  filterKey: string
  places: IPlace[]
  fetchedAt: number
  /** Un fetch sin bbox trajo todo el filtro (total <= recibidos): pedir por bbox no suma nada. */
  complete?: boolean
}

const memoryPlaces = new Map<string, CachedPlacesEntry>()

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

/**
 * Viewport redondeado hacia afuera a una grilla según el zoom (un cuarto de tile de
 * Mapbox). Un paneo chico cae en la misma celda: misma URL (caché HTTP y del server)
 * y misma clave para saber si esa zona ya se trajo.
 */
export function snapViewportToGrid(bounds: MapViewportBounds, zoom: number): MapViewportBounds {
  const z = Math.max(0, Math.min(22, Math.floor(Number.isFinite(zoom) ? zoom : 0)))
  const step = 360 / 2 ** (z + 2)
  const round = (n: number) => Math.round(n * 1e5) / 1e5
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
  return {
    west: round(clamp(Math.floor(bounds.west / step) * step, -180, 180)),
    south: round(clamp(Math.floor(bounds.south / step) * step, -85, 85)),
    east: round(clamp(Math.ceil(bounds.east / step) * step, -180, 180)),
    north: round(clamp(Math.ceil(bounds.north / step) * step, -85, 85)),
  }
}

/**
 * Área que va a mostrar Mapbox con ese centro y zoom en un contenedor de width×height px
 * (Web Mercator, tiles de 512 px). Sirve para pedir los lugares antes de que el mapa
 * termine de cargar.
 */
export function estimateViewportBounds(
  center: [number, number],
  zoom: number,
  width: number,
  height: number
): MapViewportBounds {
  const worldSize = 512 * 2 ** zoom
  const x = ((center[0] + 180) / 360) * worldSize
  const latRad = (center[1] * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize
  const toLng = (px: number) => (px / worldSize) * 360 - 180
  const toLat = (py: number) => {
    const n = Math.PI - (2 * Math.PI * py) / worldSize
    return (180 / Math.PI) * Math.atan(Math.sinh(n))
  }
  return {
    west: toLng(x - width / 2),
    east: toLng(x + width / 2),
    north: toLat(y - height / 2),
    south: toLat(y + height / 2),
  }
}

export function boundsContain(outer: MapViewportBounds, inner: MapViewportBounds): boolean {
  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  )
}

type CoveredViewport = { bounds: MapViewportBounds; fetchedAt: number }

const MAX_COVERED_PER_FILTER = 24
const coveredViewports = new Map<string, CoveredViewport[]>()

/** Un viewport que se trajo entero (todas las páginas) para ese filtro. */
export function rememberCompleteViewport(
  filterKey: string,
  bounds: MapViewportBounds,
  now = Date.now()
): void {
  const list = (coveredViewports.get(filterKey) ?? []).filter((entry) => isFresh(entry.fetchedAt, now))
  list.push({ bounds, fetchedAt: now })
  while (list.length > MAX_COVERED_PER_FILTER) list.shift()
  coveredViewports.set(filterKey, list)
}

/** Lo que queda de `target` fuera de `cut` (hasta 4 rectángulos). */
function subtractBounds(target: MapViewportBounds, cut: MapViewportBounds): MapViewportBounds[] {
  const west = Math.max(target.west, cut.west)
  const east = Math.min(target.east, cut.east)
  const south = Math.max(target.south, cut.south)
  const north = Math.min(target.north, cut.north)
  if (west >= east || south >= north) return [target]
  const pieces: MapViewportBounds[] = []
  if (target.west < west) pieces.push({ ...target, east: west })
  if (east < target.east) pieces.push({ ...target, west: east })
  if (target.south < south) pieces.push({ west, east, south: target.south, north: south })
  if (north < target.north) pieces.push({ west, east, south: north, north: target.north })
  return pieces
}

/**
 * true si las zonas ya traídas enteras (y frescas) cubren a `bounds`, aunque sea entre
 * varias (ir y volver paneando): no hace falta pedirla.
 */
export function isViewportCovered(
  filterKey: string,
  bounds: MapViewportBounds,
  now = Date.now()
): boolean {
  const list = coveredViewports.get(filterKey)
  if (!list) return false
  let remaining: MapViewportBounds[] = [bounds]
  for (const entry of list) {
    if (!isFresh(entry.fetchedAt, now)) continue
    remaining = remaining.flatMap((piece) => subtractBounds(piece, entry.bounds))
    if (remaining.length === 0) return true
  }
  return false
}

let dbPromise: Promise<IDBDatabase | null> | null = null

/** Una sola conexión por pestaña (antes se abría una nueva en cada lectura y escritura). */
function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  dbPromise ??= openDbOnce()
  return dbPromise
}

function openDbOnce(): Promise<IDBDatabase | null> {
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
      req.onsuccess = () => {
        const db = req.result
        // Si el navegador la cierra (otra pestaña con versión nueva, falta de espacio),
        // la próxima operación abre otra.
        db.onclose = () => {
          dbPromise = null
        }
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }
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

export async function writePlacesCache(
  filterKey: string,
  places: IPlace[],
  opts: { complete?: boolean; fetchedAt?: number; persist?: boolean } = {}
): Promise<void> {
  const entry: CachedPlacesEntry = {
    filterKey,
    places,
    fetchedAt: opts.fetchedAt ?? Date.now(),
    ...(opts.complete ? { complete: true } : {}),
  }
  memoryPlaces.set(filterKey, entry)
  if (opts.persist === false) return
  await idbPut(STORE_PLACES, entry)
}

/**
 * Guarda en IndexedDB lo que hay en memoria para ese filtro. Las páginas de un viewport
 * se juntan en memoria (`persist: false`) y se escriben una sola vez al final: cada
 * escritura copia la lista entera, y con 10 páginas eran 10 copias cada vez más grandes.
 */
export async function persistPlacesCache(filterKey: string): Promise<void> {
  const entry = memoryPlaces.get(filterKey)
  if (!entry) return
  await idbPut(STORE_PLACES, entry)
}

/** Página 1 de un fetch sin bbox: trae todo el filtro si el total entra en lo recibido. */
export function isCompletePlacesResponse(
  pagination: { total?: number } | undefined,
  received: number
): boolean {
  const total = pagination?.total
  return typeof total === "number" && total <= received
}

export function hasFreshCompleteList(filterKey: string, now = Date.now()): boolean {
  const entry = memoryPlaces.get(filterKey)
  return Boolean(entry?.complete && isFresh(entry.fetchedAt, now))
}

/**
 * `complete` sólo lo define un fetch sin bbox (true/false). Sin `complete` (merge por bbox)
 * se conserva la marca y el fetchedAt de la lista completa: un bbox no la renueva.
 */
export async function mergeIntoPlacesCache(
  filterKey: string,
  incoming: IPlace[],
  opts: { complete?: boolean; persist?: boolean } = {}
): Promise<IPlace[]> {
  const entry = memoryPlaces.get(filterKey)
  const existing = entry?.places ?? []
  const byId = new Map<string, IPlace>()
  for (const place of existing) {
    const id = place._id != null ? String(place._id) : ""
    if (id) byId.set(id, place)
  }
  for (const place of incoming) {
    const id = place._id != null ? String(place._id) : ""
    if (id) byId.set(id, place)
  }
  const merged = [...byId.values()]
  const persist = opts.persist
  if (opts.complete === undefined && entry?.complete) {
    await writePlacesCache(filterKey, merged, { complete: true, fetchedAt: entry.fetchedAt, persist })
  } else {
    await writePlacesCache(filterKey, merged, { complete: opts.complete === true, persist })
  }
  return merged
}

const inflightPrefetches = new Map<string, Promise<void>>()
const adjacentPrefetchAt = new Map<string, number>()

/**
 * Precarga `filterKey` sólo si no hay entrada fresca (memoria o IndexedDB) ni otro pedido
 * en vuelo para esa clave. Una entrada fresca de IndexedDB queda cargada en memoria.
 */
export function prefetchPlacesIfStale(
  filterKey: string,
  fetcher: () => Promise<unknown>
): Promise<void> {
  const inflight = inflightPrefetches.get(filterKey)
  if (inflight) return inflight
  const task = (async () => {
    const cached = await readPlacesCache(filterKey)
    if (cached && isFresh(cached.fetchedAt)) return
    await fetcher()
  })().finally(() => {
    inflightPrefetches.delete(filterKey)
  })
  inflightPrefetches.set(filterKey, task)
  return task
}

/** true una vez por clave; después false hasta que venza MAP_CACHE_TTL_MS. */
export function claimAdjacentPrefetch(primaryKey: string, now = Date.now()): boolean {
  const last = adjacentPrefetchAt.get(primaryKey)
  if (last !== undefined && isFresh(last, now)) return false
  adjacentPrefetchAt.set(primaryKey, now)
  return true
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

export function _resetMapPlacesCacheForTests(): void {
  memoryPlaces.clear()
  coveredViewports.clear()
  inflightPrefetches.clear()
  adjacentPrefetchAt.clear()
  dbPromise = null
}
