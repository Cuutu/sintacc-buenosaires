"use client"

import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { MapViewportBounds } from "@/components/map-view/geo"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { findKnownNeighborhoodSearch } from "@/lib/map-search"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { sanitizeSearchQuery } from "@/lib/analytics-search"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/validations"
import { getAdjacentNeighborhoods } from "@/lib/map-neighborhood-graph"
import {
  buildMapFilterKey,
  hasFreshViewportTile,
  isPlacesCacheFresh,
  mergeCachedPlaces,
  mergeIntoPlacesCache,
  readPlacesCache,
  rememberViewportTile,
  viewportTileCacheKey,
  writePlacesCache,
} from "@/lib/map-places-cache"

const SEARCH_DEBOUNCE_MS = 650
const MIN_SEARCH_LENGTH = 2
/** Alineado con el techo de GET /api/places (ver PUBLIC_PLACES_MAX_LIMIT). */
const MAP_PLACES_LIMIT = PUBLIC_PLACES_MAX_LIMIT

function bboxParam(bounds: MapViewportBounds): string {
  return `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
}

function MapaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
  const [filters, setFilters] = useState<MapFilters>(() => ({
    search: searchParams.get("search") || "",
    tags: [],
    type: undefined,
    neighborhood: undefined,
    safetyLevel: undefined,
  }))
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchParams.get("search") || ""
  )
  const lastSyncedUrlSearchRef = useRef(searchParams.get("search") || "")
  const fetchRequestSeqRef = useRef(0)
  const lastFetchedFilterKeyRef = useRef<string | null>(null)
  const forceRefreshRef = useRef(false)
  const mapOpenTracked = useRef(false)
  const lastFilterTrackKey = useRef("")
  const lastSearchTrackKey = useRef("")

  useEffect(() => {
    if (mapOpenTracked.current) return
    mapOpenTracked.current = true
    trackEvent("map_open", { source: "mapa_page" })
  }, [])

  const handleFiltersChange = useCallback((next: MapFilters) => {
    setFilters(next)
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
      safetyLevel: next.safetyLevel || "",
      hasType: Boolean(next.type),
      hasNeighborhood: Boolean(next.neighborhood),
      hasSafety: Boolean(next.safetyLevel),
      hasSearch: Boolean(next.search?.trim()),
    })
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
      setDebouncedSearch(
        trimmedSearch.length === 0 || trimmedSearch.length >= MIN_SEARCH_LENGTH
          ? filters.search
          : ""
      )
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
    const qs = params.toString()
    lastSyncedUrlSearchRef.current = debouncedSearch.trim()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [debouncedSearch, pathname, router, searchParams])

  const fetchPlaces = useCallback(async (opts?: { bounds?: MapViewportBounds; silent?: boolean }) => {
    const search = debouncedSearch.trim()
    const searchNeighborhood = findKnownNeighborhoodSearch(search)
    const freeTextSearch = searchNeighborhood ? "" : search
    const effectiveNeighborhood = searchNeighborhood ?? filters.neighborhood ?? ""
    const bounds = opts?.bounds
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

    const applyMerged = (primaryKey: string, extraKeys: string[] = []) => {
      setPlaces(mergeCachedPlaces([primaryKey, ...extraKeys]))
    }

    const reportSearch = (resultCount: number) => {
      const query = sanitizeSearchQuery(search)
      if (!query) return
      const key = `${filterKey}|${resultCount}`
      if (lastSearchTrackKey.current === key) return
      lastSearchTrackKey.current = key
      const kind = searchNeighborhood ? "neighborhood" : "text"
      const city = searchNeighborhood || localitySlugsFromUrl || ""
      trackEvent("search_performed", { query, resultCount, kind, city })
      if (resultCount === 0) {
        trackEvent("search_no_results", { query, kind, city })
      }
    }

    const buildParams = (neighborhood: string, searchText: string, viewport?: MapViewportBounds) => {
      const params = new URLSearchParams()
      params.append("limit", String(MAP_PLACES_LIMIT))
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

    const networkFetch = async (
      key: string,
      neighborhood: string,
      searchText: string,
      viewport?: MapViewportBounds
    ) => {
      const data = await fetchApi<{ places: IPlace[] }>(
        `/api/places?${buildParams(neighborhood, searchText, viewport).toString()}`
      )
      const incoming = data.places || []
      if (viewport) {
        await mergeIntoPlacesCache(key, incoming)
      } else {
        await writePlacesCache(key, incoming)
      }
      return incoming
    }

    const prefetchAdjacent = (primaryKey: string) => {
      if (!effectiveNeighborhood) return
      const neighbors = getAdjacentNeighborhoods(effectiveNeighborhood)
      const extraKeys = neighbors.map((name) =>
        buildMapFilterKey({
          citySlugs: "",
          provinceSlugs: "",
          localitySlugs: "",
          search: "",
          type: filters.type ?? "",
          neighborhood: name,
          tags: filters.tags,
          safetyLevel: filters.safetyLevel ?? "",
        })
      )
      const run = () => {
        neighbors.forEach((name, index) => {
          const key = extraKeys[index]
          if (isPlacesCacheFresh(key)) {
            applyMerged(primaryKey, extraKeys)
            return
          }
          void networkFetch(key, name, "")
            .then(() => applyMerged(primaryKey, extraKeys))
            .catch(() => {
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
      try {
        await networkFetch(filterKey, effectiveNeighborhood, freeTextSearch, bounds)
        lastFetchedFilterKeyRef.current = filterKey
        applyMerged(filterKey)
        setPlacesError(null)
        return true
      } catch {
        return false
      }
    }

    const cached = forceRefreshRef.current ? null : await readPlacesCache(filterKey)
    forceRefreshRef.current = false
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
    filters.type,
    filters.neighborhood,
    filters.tags,
    filters.safetyLevel,
  ])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  useEffect(() => {
    if (placeIdFromUrl) setSelectedPlaceId(placeIdFromUrl)
  }, [placeIdFromUrl])

  const handleMapMoveEnd = useCallback(
    (zoom: number, bounds: MapViewportBounds) => {
      const filterKey = lastFetchedFilterKeyRef.current ?? ""
      const tileKey = viewportTileCacheKey(filterKey, bounds, zoom)
      if (forceRefreshRef.current || !hasFreshViewportTile(tileKey)) {
        void fetchPlaces({ bounds, silent: true }).then((ok) => {
          if (ok) rememberViewportTile(tileKey, [])
        })
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
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [
      citySlugsFromUrl,
      provinceSlugsFromUrl,
      localitySlugsFromUrl,
      pathname,
      router,
      searchParams,
      fetchPlaces,
    ]
  )

  const handleSheetCollapse = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("list")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleListOpen = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("list", "open")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <MapScreen
      places={places}
      loading={loading}
      loadError={placesError}
      onRetryLoad={() => {
        lastFetchedFilterKeyRef.current = null
        forceRefreshRef.current = true
        fetchPlaces()
      }}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      searchQuery={debouncedSearch}
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