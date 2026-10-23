"use client"

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react"
import { useSearchParams, usePathname } from "next/navigation"
// Sin el barrel de map-view: el barrel exporta MapboxMap y metía Mapbox GL en el JS inicial.
import { MapScreen } from "@/components/map-view/MapScreen"
import type { MapFilters } from "@/components/map-view/MapTopBar"
import { CABA_CENTER, CABA_ZOOM, type MapViewportBounds } from "@/components/map-view/geo"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { findKnownNeighborhoodSearch } from "@/lib/map-search"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { recordIntentSignal } from "@/lib/analytics-discovery"
import { unlockStoreBanner } from "@/lib/bottom-prompt"
import { sanitizeSearchQuery } from "@/lib/analytics-search"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/places-limits"
import { parseMapTypeParam } from "@/lib/map-url-filters"
import { preloadMapboxMap } from "@/lib/mapbox-preload"
import {
  applyOnly100ToTags,
  readOnly100,
  refinePlacesBySafetyMode,
  SAFETY_MODE_EVENT,
  safetyModeFromTags,
  withSafetyMode,
  writeOnly100,
} from "@/lib/safety-mode"
import { getAdjacentNeighborhoods } from "@/lib/map-neighborhood-graph"
import {
  boundsContain,
  buildMapFilterKey,
  claimAdjacentPrefetch,
  estimateViewportBounds,
  hasFreshCompleteList,
  isCompletePlacesResponse,
  isPlacesCacheFresh,
  isViewportCovered,
  mergeCachedPlaces,
  mergeIntoPlacesCache,
  persistPlacesCache,
  prefetchPlacesIfStale,
  readPlacesCache,
  rememberCompleteViewport,
  snapViewportToGrid,
} from "@/lib/map-places-cache"
import {
  MAP_VIEWPORT_MAX_PAGES,
  nextViewportPage,
  paginationTotalPages,
} from "@/lib/map-viewport-pages"
import {
  geocodeMapSearchAddress,
  looksLikeStreetAddress,
  type MapSearchPin,
} from "@/lib/map-address-search"

/** El buscador ya espera 250 ms antes de avisar (MapTopBar): en total sigue siendo ~650 ms. */
const SEARCH_DEBOUNCE_MS = 400
const MIN_SEARCH_LENGTH = 2
/** Alineado con el techo de GET /api/places (ver PUBLIC_PLACES_MAX_LIMIT). */
const MAP_PLACES_LIMIT = PUBLIC_PLACES_MAX_LIMIT
/** Si el mapa no avisa su área (sin WebGL, red lenta), la lista no espera más que esto. */
const VIEWPORT_WAIT_MAX_MS = 8000
// El chunk de Mapbox empieza a bajar apenas se evalúa esta página, en paralelo con la
// hidratación (el componente del mapa recién se monta después).
if (typeof window !== "undefined") preloadMapboxMap()

/**
 * Páginas de un viewport que se piden a la vez, después de la primera. Con 4, el área
 * de CABA a zoom 12 (5 páginas) sale de una: si se piden de a pocas, cada tanda espera
 * a que el hilo principal se libere (hidratación, arranque de Mapbox) para salir.
 */
const VIEWPORT_PAGE_CONCURRENCY = 4

/**
 * Cambia la URL del mapa (lista abierta, búsqueda, ciudad) sin ir al servidor. Next 14.2
 * sincroniza history.replaceState con useSearchParams; router.replace en cambio pedía
 * de nuevo la página de /mapa al servidor en cada cambio (abrir la lista tardaba ~1 s).
 */
function replaceMapUrl(pathname: string, params: URLSearchParams): void {
  const qs = params.toString()
  window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname)
}

/**
 * Tamaño aproximado del mapa antes de que exista: en el celular ocupa toda la pantalla;
 * en la compu, la ventana menos la columna de la lista (MapDesktop: entre 440 y 520 px)
 * y la barra de arriba. Si se queda corto, el mapa pide lo que falte al cargar.
 */
function estimatedMapSize(): { width: number; height: number } {
  const width = window.innerWidth
  const height = window.innerHeight
  if (window.matchMedia("(max-width: 768px)").matches) return { width, height }
  const aside = Math.min(520, Math.max(440, Math.min(480, width * 0.4)))
  return { width: Math.max(320, width - aside), height: Math.max(320, height - 80) }
}

function bboxParam(bounds: MapViewportBounds): string {
  return `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
}

function MapaContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const placeIdFromUrl = searchParams.get("place")
  const listOpen = searchParams.get("list") === "open"
  const citySlugsFromUrl = searchParams.get("citySlugs")
  const provinceSlugsFromUrl = searchParams.get("provinceSlugs")
  const localitySlugsFromUrl = searchParams.get("localitySlugs")
  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")
  const zoomParam = searchParams.get("zoom")
  const initialCenter: [number, number] | undefined =
    latParam != null &&
    lngParam != null &&
    !Number.isNaN(parseFloat(latParam)) &&
    !Number.isNaN(parseFloat(lngParam))
      ? [parseFloat(lngParam), parseFloat(latParam)]
      : undefined
  const initialZoom =
    zoomParam != null && !Number.isNaN(parseInt(zoomParam, 10))
      ? parseInt(zoomParam, 10)
      : undefined
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(placeIdFromUrl)
  // La primera página sin bbox es de todo el país: filtrada al área del mapa a veces deja
  // 1 lugar. Hasta que llega lo del área visible, la lista muestra el esqueleto.
  const [awaitingViewport, setAwaitingViewport] = useState(true)
  // Un ?place= de otra ciudad no viene en lo que trae el mapa al abrir: se pide aparte
  // para que la tarjeta se abra y el mapa vaya hasta ese lugar.
  const [deepLinkPlace, setDeepLinkPlace] = useState<IPlace | null>(null)
  const [filters, setFilters] = useState<MapFilters>(() => ({
    search: searchParams.get("search") || "",
    tags: [],
    type: parseMapTypeParam(searchParams.get("type")),
    neighborhood: undefined,
    safetyLevel: undefined,
  }))
  // El modo "Sólo 100%" vive en localStorage: se aplica después de montar (la página se
  // renderiza en el servidor sin saberlo) y el primer fetch espera a que esté aplicado.
  const [safetyModeReady, setSafetyModeReady] = useState(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  // Un link directo a un lugar (?place=, desde una ficha, una lista o el chat) tiene que
  // mostrarlo aunque sea "con opciones": ahí no se aplica el modo guardado.
  const initialPlaceParamRef = useRef(placeIdFromUrl)
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchParams.get("search") || ""
  )
  const lastSyncedUrlSearchRef = useRef(searchParams.get("search") || "")
  const fetchRequestSeqRef = useRef(0)
  const lastFetchedFilterKeyRef = useRef<string | null>(null)
  const lastBoundsRef = useRef<MapViewportBounds | null>(null)
  // Viewport que se está pidiendo: un pedido para una zona que ya está en camino no sale.
  const inflightViewportRef = useRef<{ filterKey: string; bounds: MapViewportBounds } | null>(
    null
  )
  const earlyViewportRequestedRef = useRef(false)
  const forceRefreshRef = useRef(false)
  const mapOpenTracked = useRef(false)
  const lastFilterTrackKey = useRef("")
  const lastSearchTrackKey = useRef("")
  // Búsqueda por dirección: si el texto no matchea lugares, geocodificamos y el mapa
  // vuela a ese punto mostrando lo que hay alrededor (el texto deja de filtrar).
  const [searchPin, setSearchPin] = useState<MapSearchPin | null>(null)
  const debouncedSearchRef = useRef(debouncedSearch)
  debouncedSearchRef.current = debouncedSearch
  const geocodeAbortRef = useRef<AbortController | null>(null)
  const addressMode = searchPin != null && searchPin.query === debouncedSearch.trim()

  const requestAddressPin = useCallback(async (query: string) => {
    geocodeAbortRef.current?.abort()
    const controller = new AbortController()
    geocodeAbortRef.current = controller
    try {
      const pin = await geocodeMapSearchAddress(query, controller.signal)
      if (controller.signal.aborted || !pin) return
      if (debouncedSearchRef.current.trim() !== query) return
      setSearchPin(pin)
    } catch {
      /* sin red o geocoder caído: queda el "sin resultados" de siempre */
    }
  }, [])

  useEffect(() => () => geocodeAbortRef.current?.abort(), [])

  useEffect(() => {
    if (mapOpenTracked.current) return
    mapOpenTracked.current = true
    trackEvent("map_open", { source: "mapa_page" })
  }, [])

  useEffect(() => {
    if (selectedPlaceId) unlockStoreBanner()
  }, [selectedPlaceId])

  useEffect(() => {
    if (!awaitingViewport) return
    const timer = window.setTimeout(() => setAwaitingViewport(false), VIEWPORT_WAIT_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [awaitingViewport])

  useEffect(() => {
    if (!placeIdFromUrl) {
      setDeepLinkPlace(null)
      return
    }
    let cancelled = false
    fetchApi<IPlace>(`/api/places/${encodeURIComponent(placeIdFromUrl)}`)
      .then((place) => {
        if (cancelled || place?._id == null) return
        setDeepLinkPlace(place)
        // ?place= también acepta el slug; la selección va siempre por _id.
        const id = String(place._id)
        setSelectedPlaceId((current) => (current === placeIdFromUrl ? id : current))
      })
      .catch(() => {
        /* lugar inexistente o sin red: el mapa abre como siempre */
      })
    return () => {
      cancelled = true
    }
  }, [placeIdFromUrl])

  useEffect(() => {
    if (!initialPlaceParamRef.current && readOnly100()) {
      setFilters((f) => ({ ...f, tags: applyOnly100ToTags(f.tags, true) }))
    }
    setSafetyModeReady(true)
  }, [])

  // El modo también se cambia desde la bienvenida, que puede abrirse encima del mapa.
  useEffect(() => {
    const onSafetyMode = () => {
      const only100 = readOnly100()
      setFilters((f) => {
        const mode = safetyModeFromTags(f.tags)
        if (only100 && mode !== "cien") return { ...f, safetyLevel: undefined, tags: withSafetyMode(f.tags, "cien") }
        if (!only100 && mode === "cien") return { ...f, tags: withSafetyMode(f.tags, "todos") }
        return f
      })
    }
    window.addEventListener(SAFETY_MODE_EVENT, onSafetyMode)
    return () => window.removeEventListener(SAFETY_MODE_EVENT, onSafetyMode)
  }, [])

  const handleFiltersChange = useCallback((next: MapFilters) => {
    setFilters(next)
    // El selector del mapa es otra puerta al modo: si el usuario cambia el filtro de
    // seguridad, lo último que eligió queda guardado. Otros filtros no lo tocan.
    const prevSafety = safetyModeFromTags(filtersRef.current.tags)
    const nextSafety = safetyModeFromTags(next.tags ?? [])
    if (prevSafety !== nextSafety) {
      const only100 = nextSafety === "cien"
      if (only100 !== readOnly100()) writeOnly100(only100)
    }
    // Desde la fase 1 el filtro de seguridad viaja en tags; para Insights se sigue
    // reportando como safetyLevel.
    const trackedSafety =
      next.safetyLevel ||
      (nextSafety === "cien" ? "dedicated_gf" : nextSafety === "opc" ? "gf_options" : "")
    const key = JSON.stringify({
      type: next.type ?? "",
      tags: [...(next.tags ?? [])].sort(),
      neighborhood: next.neighborhood ?? "",
      safetyLevel: next.safetyLevel ?? "",
      hasSearch: Boolean(next.search?.trim()),
    })
    if (key === lastFilterTrackKey.current) return
    lastFilterTrackKey.current = key
    trackEvent("map_filter", {
      type: next.type || "",
      tagCount: next.tags?.length ?? 0,
      neighborhood: next.neighborhood || "",
      safetyLevel: trackedSafety,
      hasType: Boolean(next.type),
      hasNeighborhood: Boolean(next.neighborhood),
      hasSafety: Boolean(trackedSafety),
      hasSearch: Boolean(next.search?.trim()),
    })
    recordIntentSignal("map_filter")
  }, [])

  useEffect(() => {
    const urlSearch = searchParams.get("search") || ""
    if (urlSearch === lastSyncedUrlSearchRef.current) return
    lastSyncedUrlSearchRef.current = urlSearch
    setFilters((f) => (f.search !== urlSearch ? { ...f, search: urlSearch } : f))
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev))
  }, [searchParams])

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmedSearch = filters.search.trim()
      const nextDebouncedSearch =
        trimmedSearch.length === 0 || trimmedSearch.length >= MIN_SEARCH_LENGTH
          ? filters.search
          : ""
      setDebouncedSearch(nextDebouncedSearch)
      if (nextDebouncedSearch.trim()) {
        lastBoundsRef.current = null
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filters.search])

  useEffect(() => {
    if (!placeIdFromUrl) setSelectedPlaceId(null)
  }, [debouncedSearch, placeIdFromUrl])

  useEffect(() => {
    const urlSearch = searchParams.get("search") || ""
    if (debouncedSearch === urlSearch) return
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
    else params.delete("search")
    lastSyncedUrlSearchRef.current = debouncedSearch.trim()
    replaceMapUrl(pathname, params)
  }, [debouncedSearch, pathname, searchParams])

  const fetchPlaces = useCallback(async (opts?: { bounds?: MapViewportBounds; silent?: boolean }) => {
    const search = debouncedSearch.trim()
    const searchNeighborhood = findKnownNeighborhoodSearch(search)
    const freeTextSearch = searchNeighborhood || addressMode ? "" : search
    const effectiveNeighborhood = searchNeighborhood ?? filters.neighborhood ?? ""
    if (opts?.bounds) lastBoundsRef.current = opts.bounds
    const bounds = opts?.bounds ?? lastBoundsRef.current ?? undefined
    const silent = Boolean(opts?.silent)
    const filterKey = buildMapFilterKey({
      citySlugs: searchNeighborhood ? "" : citySlugsFromUrl ?? "",
      provinceSlugs: searchNeighborhood ? "" : provinceSlugsFromUrl ?? "",
      localitySlugs: searchNeighborhood ? "" : localitySlugsFromUrl ?? "",
      search: freeTextSearch,
      type: filters.type ?? "",
      neighborhood: effectiveNeighborhood,
      tags: filters.tags,
      safetyLevel: filters.safetyLevel ?? "",
    })

    const applyMerged = (primaryKey: string) => {
      setPlaces(mergeCachedPlaces([primaryKey]))
    }

    const reportSearch = (resultCount: number) => {
      if (resultCount === 0 && freeTextSearch && looksLikeStreetAddress(freeTextSearch)) {
        void requestAddressPin(freeTextSearch.trim())
      }
      // En modo dirección ya se reportó la búsqueda de texto (0 resultados): no duplicar.
      if (addressMode) return
      const query = sanitizeSearchQuery(search)
      if (!query) return
      const key = `${filterKey}|${resultCount}`
      if (lastSearchTrackKey.current === key) return
      lastSearchTrackKey.current = key
      const kind = searchNeighborhood ? "neighborhood" : "text"
      const city = searchNeighborhood || localitySlugsFromUrl || ""
      trackEvent("search_performed", { query, resultCount, kind, city })
      recordIntentSignal("search_performed")
      if (resultCount === 0) {
        trackEvent("search_no_results", { query, kind, city })
      }
    }

    const buildParams = (
      neighborhood: string,
      searchText: string,
      viewport?: MapViewportBounds,
      page = 1
    ) => {
      const params = new URLSearchParams()
      params.append("limit", String(MAP_PLACES_LIMIT))
      params.append("page", String(page))
      if (citySlugsFromUrl && !searchNeighborhood) params.append("citySlugs", citySlugsFromUrl)
      if (provinceSlugsFromUrl && !searchNeighborhood) params.append("provinceSlugs", provinceSlugsFromUrl)
      if (localitySlugsFromUrl && !searchNeighborhood) params.append("localitySlugs", localitySlugsFromUrl)
      if (searchText) params.append("search", searchText)
      if (filters.type && filters.type !== "all") params.append("type", filters.type)
      if (neighborhood && neighborhood !== "all") params.append("neighborhood", neighborhood)
      if (filters.tags?.length) params.append("tags", filters.tags.join(","))
      if (filters.safetyLevel) params.append("safetyLevel", filters.safetyLevel)
      if (viewport) params.append("bbox", bboxParam(viewport))
      return params
    }

    type PlacesListResponse = {
      places: IPlace[]
      pagination?: { page: number; limit: number; total: number; pages: number }
    }

    const fetchPage = (
      neighborhood: string,
      searchText: string,
      viewport: MapViewportBounds | undefined,
      page: number
    ) =>
      fetchApi<PlacesListResponse>(
        `/api/places?${buildParams(neighborhood, searchText, viewport, page).toString()}`
      )

    const networkFetch = async (
      key: string,
      neighborhood: string,
      searchText: string,
      viewport?: MapViewportBounds
    ) => {
      const data = await fetchPage(neighborhood, searchText, viewport, 1)
      const incoming = data.places || []
      await mergeIntoPlacesCache(
        key,
        incoming,
        viewport ? {} : { complete: isCompletePlacesResponse(data.pagination, incoming.length) }
      )
      return incoming
    }

    /**
     * Todas las páginas de un viewport. La 1 se muestra apenas llega; el resto se pide
     * de a VIEWPORT_PAGE_CONCURRENCY en paralelo y se muestra todo junto al final (un
     * solo setPlaces, un solo setData en el mapa). IndexedDB se escribe después, una vez.
     */
    const networkFetchViewport = async (
      key: string,
      neighborhood: string,
      searchText: string,
      viewport: MapViewportBounds,
      requestSeq: number
    ): Promise<{ ok: boolean; complete: boolean }> => {
      const stale = () => requestSeq !== fetchRequestSeqRef.current
      const first = await fetchPage(neighborhood, searchText, viewport, 1)
      if (stale()) return { ok: false, complete: false }
      const firstBatch = first.places || []
      await mergeIntoPlacesCache(key, firstBatch, { persist: false })
      if (stale()) return { ok: false, complete: false }
      applyMerged(key)
      setAwaitingViewport(false)

      const limit = first.pagination?.limit ?? MAP_PLACES_LIMIT
      const totalPages = paginationTotalPages(first.pagination)

      if (totalPages == null) {
        // Sin total (respuesta vieja): de a una, mientras vengan llenas.
        let page = 1
        let received = firstBatch.length
        let next = nextViewportPage({ page, received, limit })
        while (next != null) {
          if (stale()) return { ok: false, complete: false }
          page = next
          const data = await fetchPage(neighborhood, searchText, viewport, page)
          const batch = data.places || []
          received = batch.length
          await mergeIntoPlacesCache(key, batch, { persist: false })
          next = nextViewportPage({ page, received, limit })
        }
        if (stale()) return { ok: false, complete: false }
        if (page > 1) applyMerged(key)
        const capped = page >= MAP_VIEWPORT_MAX_PAGES && received >= limit
        return { ok: true, complete: !capped }
      }

      const lastPage = Math.min(totalPages, MAP_VIEWPORT_MAX_PAGES)
      const pending: number[] = []
      for (let page = 2; page <= lastPage; page += 1) pending.push(page)
      let failure: unknown = null
      const worker = async () => {
        while (pending.length > 0 && failure == null && !stale()) {
          const page = pending.shift() as number
          try {
            const data = await fetchPage(neighborhood, searchText, viewport, page)
            if (stale()) return
            await mergeIntoPlacesCache(key, data.places || [], { persist: false })
          } catch (error) {
            failure = error
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(VIEWPORT_PAGE_CONCURRENCY, pending.length) }, worker)
      )
      if (stale()) return { ok: false, complete: false }
      // Lo que llegó se muestra igual; si una página falló, el error sigue para arriba.
      if (lastPage > 1) applyMerged(key)
      if (failure != null) throw failure
      return { ok: true, complete: totalPages <= MAP_VIEWPORT_MAX_PAGES }
    }

    /**
     * Precarga los barrios vecinos para que, si la persona busca uno de ellos después, ya
     * esté en caché. NO se suman a la lista: "Palermo" mostraba "236 en Palermo" con
     * lugares de Recoleta, Colegiales, Belgrano… (revisión 23/10). Lo que se ve y se
     * cuenta es solo el barrio buscado.
     */
    const prefetchAdjacent = (primaryKey: string) => {
      if (!effectiveNeighborhood) return
      const neighbors = getAdjacentNeighborhoods(effectiveNeighborhood)
      const run = () => {
        // Una vez por filtro mientras esté fresco; cada vecino mira memoria + IndexedDB
        // y comparte el pedido si ya hay uno en vuelo.
        if (!claimAdjacentPrefetch(primaryKey)) return
        neighbors.forEach((name) => {
          const key = buildMapFilterKey({
            citySlugs: "",
            provinceSlugs: "",
            localitySlugs: "",
            search: "",
            type: filters.type ?? "",
            neighborhood: name,
            tags: filters.tags,
            safetyLevel: filters.safetyLevel ?? "",
          })
          void prefetchPlacesIfStale(key, () => networkFetch(key, name, "")).catch(() => {
            /* prefetch silencioso */
          })
        })
      }
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 2500 })
      } else {
        setTimeout(run, 400)
      }
    }

    if (bounds) {
      const force = forceRefreshRef.current
      forceRefreshRef.current = false
      // Zona ya traída entera para este filtro (por ejemplo, al hacer zoom adentro).
      if (!force && isViewportCovered(filterKey, bounds)) {
        if (lastFetchedFilterKeyRef.current !== filterKey) {
          lastFetchedFilterKeyRef.current = filterKey
          applyMerged(filterKey)
        }
        setPlacesError(null)
        setLoading(false)
        setAwaitingViewport(false)
        return true
      }
      const inflight = inflightViewportRef.current
      if (
        !force &&
        inflight &&
        inflight.filterKey === filterKey &&
        boundsContain(inflight.bounds, bounds)
      ) {
        return false
      }
      const thisRequest = { filterKey, bounds }
      inflightViewportRef.current = thisRequest
      const requestSeq = fetchRequestSeqRef.current + 1
      fetchRequestSeqRef.current = requestSeq
      try {
        const result = await networkFetchViewport(
          filterKey,
          effectiveNeighborhood,
          freeTextSearch,
          bounds,
          requestSeq
        )
        if (!result.ok || requestSeq !== fetchRequestSeqRef.current) return false
        if (result.complete) rememberCompleteViewport(filterKey, bounds)
        void persistPlacesCache(filterKey)
        lastFetchedFilterKeyRef.current = filterKey
        setPlacesError(null)
        setLoading(false)
        return true
      } catch {
        if (requestSeq === fetchRequestSeqRef.current) {
          setLoading(false)
          setAwaitingViewport(false)
        }
        return false
      } finally {
        if (inflightViewportRef.current === thisRequest) inflightViewportRef.current = null
      }
    }

    // Si mientras se lee IndexedDB arrancó el pedido del área visible (el mapa terminó
    // de cargar), ese manda: no se pisa con la lista de todo el país.
    const seqBeforeCache = fetchRequestSeqRef.current
    const cached = forceRefreshRef.current ? null : await readPlacesCache(filterKey)
    forceRefreshRef.current = false
    if (fetchRequestSeqRef.current !== seqBeforeCache) return
    if (cached?.places?.length) {
      lastFetchedFilterKeyRef.current = filterKey
      applyMerged(filterKey)
      reportSearch(mergeCachedPlaces([filterKey]).length)
      setPlacesError(null)
      setLoading(false)
      if (!isPlacesCacheFresh(filterKey)) {
        try {
          await networkFetch(filterKey, effectiveNeighborhood, freeTextSearch)
          applyMerged(filterKey)
        } catch {
          /* keep cached */
        }
      }
      prefetchAdjacent(filterKey)
      return
    }

    if (lastFetchedFilterKeyRef.current === filterKey) return

    const requestSeq = fetchRequestSeqRef.current + 1
    fetchRequestSeqRef.current = requestSeq
    if (!silent) {
      setLoading(true)
      setPlacesError(null)
    }
    try {
      await networkFetch(filterKey, effectiveNeighborhood, freeTextSearch)
      if (requestSeq !== fetchRequestSeqRef.current) return
      lastFetchedFilterKeyRef.current = filterKey
      applyMerged(filterKey)
      reportSearch(mergeCachedPlaces([filterKey]).length)
      setPlacesError(null)
      prefetchAdjacent(filterKey)
    } catch (error: any) {
      if (requestSeq !== fetchRequestSeqRef.current) return
      if (silent) return
      const message = error?.message || "Error al cargar lugares"
      toast.error(message)
      setPlaces([])
      setPlacesError(message)
      trackEvent("map_load_error", { reason: "places_fetch" })
    } finally {
      if (requestSeq === fetchRequestSeqRef.current && !silent) setLoading(false)
    }
  }, [
    citySlugsFromUrl,
    provinceSlugsFromUrl,
    localitySlugsFromUrl,
    debouncedSearch,
    addressMode,
    requestAddressPin,
    filters.type,
    filters.neighborhood,
    filters.tags,
    filters.safetyLevel,
  ])

  useEffect(() => {
    if (!safetyModeReady) return
    fetchPlaces()
  }, [fetchPlaces, safetyModeReady])

  // Vista de entrada sin búsqueda ni ciudad: los lugares del área que va a mostrar el mapa
  // se piden ya, sin esperar a que baje Mapbox. Cuando el mapa avisa su área real (que
  // cae adentro), ese pedido ya está en camino o terminado y no se repite.
  useEffect(() => {
    if (!safetyModeReady || earlyViewportRequestedRef.current) return
    earlyViewportRequestedRef.current = true
    if (lastBoundsRef.current) return
    if (debouncedSearch.trim() || placeIdFromUrl) return
    if (citySlugsFromUrl || provinceSlugsFromUrl || localitySlugsFromUrl) return
    const zoom = initialZoom ?? CABA_ZOOM
    const center = initialCenter ?? CABA_CENTER
    const size = estimatedMapSize()
    const estimated = estimateViewportBounds(center, zoom, size.width, size.height)
    void fetchPlaces({ bounds: snapViewportToGrid(estimated, zoom), silent: true })
    // Solo al entrar: después manda el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safetyModeReady])

  useEffect(() => {
    if (placeIdFromUrl) setSelectedPlaceId(placeIdFromUrl)
  }, [placeIdFromUrl])

  const handleMapMoveEnd = useCallback(
    (zoom: number, bounds: MapViewportBounds) => {
      // Se pide la zona redondeada a una grilla: un paneo chico repite la misma URL y,
      // si esa zona ya se trajo entera, no se pide (lo resuelve fetchPlaces).
      const snapped = snapViewportToGrid(bounds, zoom)
      const filterKey = lastFetchedFilterKeyRef.current ?? ""
      if (!forceRefreshRef.current && hasFreshCompleteList(filterKey)) {
        // Ya tenemos todo el filtro: el bbox no traería nada nuevo. Guardamos el viewport
        // para que un cambio de filtro pida el área que se está viendo, no una vieja.
        lastBoundsRef.current = snapped
        setAwaitingViewport(false)
      } else {
        void fetchPlaces({ bounds: snapped, silent: true })
      }

      const params = new URLSearchParams(searchParams.toString())
      let shouldReplaceUrl = false

      if ((citySlugsFromUrl || provinceSlugsFromUrl || localitySlugsFromUrl) && zoom < 8) {
        params.delete("citySlugs")
        params.delete("provinceSlugs")
        params.delete("localitySlugs")
        shouldReplaceUrl = true
      }

      if (!shouldReplaceUrl) return
      replaceMapUrl(pathname, params)
    },
    [
      citySlugsFromUrl,
      provinceSlugsFromUrl,
      localitySlugsFromUrl,
      pathname,
      searchParams,
      fetchPlaces,
    ]
  )

  const handleSheetCollapse = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("list")
    replaceMapUrl(pathname, params)
  }, [pathname, searchParams])

  const handleListOpen = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("list", "open")
    replaceMapUrl(pathname, params)
  }, [pathname, searchParams])

  // Que el selector y los pines digan lo mismo (ver refinePlacesBySafetyMode).
  const visiblePlaces = useMemo(() => {
    const refined = refinePlacesBySafetyMode(places, safetyModeFromTags(filters.tags))
    if (!deepLinkPlace) return refined
    const deepLinkId = String(deepLinkPlace._id)
    if (selectedPlaceId !== deepLinkId) return refined
    if (refined.some((place) => String(place._id) === deepLinkId)) return refined
    return [...refined, deepLinkPlace]
  }, [places, filters.tags, deepLinkPlace, selectedPlaceId])

  // Con búsqueda la lista no se recorta al área del mapa: no hace falta esperarla.
  const listLoading = loading || (awaitingViewport && !debouncedSearch.trim())

  return (
    <MapScreen
      places={visiblePlaces}
      loading={listLoading}
      loadError={placesError}
      onRetryLoad={() => {
        lastFetchedFilterKeyRef.current = null
        forceRefreshRef.current = true
        fetchPlaces()
      }}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      searchQuery={addressMode ? "" : debouncedSearch}
      searchPin={addressMode ? searchPin : null}
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={(place) => setSelectedPlaceId(place._id.toString())}
      onPlaceDeselect={() => setSelectedPlaceId(null)}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      placeIdToFocus={placeIdFromUrl}
      listOpen={listOpen}
      onSheetCollapse={handleSheetCollapse}
      onListOpen={handleListOpen}
      onMapMoveEnd={handleMapMoveEnd}
    />
  )
}

export function MapaPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center text-muted-foreground md:h-[calc(100vh-var(--desktop-nav-clearance))]">
          Cargando mapa...
        </div>
      }
    >
      <MapaContent />
    </Suspense>
  )
}
