"use client"

import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { MapViewportBounds } from "@/components/map-view/MapboxMap"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { findKnownNeighborhoodSearch } from "@/lib/map-search"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/validations"

const SEARCH_DEBOUNCE_MS = 650
const MIN_SEARCH_LENGTH = 2
const CLEAR_NEIGHBORHOOD_SEARCH_ZOOM = 12
/** Alineado con el techo de GET /api/places (ver PUBLIC_PLACES_MAX_LIMIT). */
const MAP_PLACES_LIMIT = PUBLIC_PLACES_MAX_LIMIT

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
  const mapOpenTracked = useRef(false)
  const lastFilterTrackKey = useRef("")

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
      hasType: Boolean(next.type),
      tagCount: next.tags?.length ?? 0,
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

  const fetchPlaces = useCallback(async () => {
    const search = debouncedSearch.trim()
    const searchNeighborhood = findKnownNeighborhoodSearch(search)
    const freeTextSearch = searchNeighborhood ? "" : search
    const effectiveNeighborhood = searchNeighborhood ?? filters.neighborhood ?? ""
    const filterKey = JSON.stringify({
      citySlugs: searchNeighborhood ? "" : citySlugsFromUrl ?? "",
      provinceSlugs: searchNeighborhood ? "" : provinceSlugsFromUrl ?? "",
      localitySlugs: searchNeighborhood ? "" : localitySlugsFromUrl ?? "",
      search: freeTextSearch,
      type: filters.type ?? "",
      neighborhood: effectiveNeighborhood,
      tags: [...(filters.tags ?? [])].sort(),
      safetyLevel: filters.safetyLevel ?? "",
    })

    if (lastFetchedFilterKeyRef.current === filterKey) return

    const requestSeq = fetchRequestSeqRef.current + 1
    fetchRequestSeqRef.current = requestSeq
    setLoading(true)
    setPlacesError(null)
    try {
      const params = new URLSearchParams()
      params.append("limit", String(MAP_PLACES_LIMIT))
      if (citySlugsFromUrl && !searchNeighborhood) params.append("citySlugs", citySlugsFromUrl)
      if (provinceSlugsFromUrl && !searchNeighborhood) params.append("provinceSlugs", provinceSlugsFromUrl)
      if (localitySlugsFromUrl && !searchNeighborhood) params.append("localitySlugs", localitySlugsFromUrl)
      if (freeTextSearch) params.append("search", freeTextSearch)
      if (filters.type && filters.type !== "all") params.append("type", filters.type)
      if (effectiveNeighborhood && effectiveNeighborhood !== "all")
        params.append("neighborhood", effectiveNeighborhood)
      if (filters.tags?.length) params.append("tags", filters.tags.join(","))
      if (filters.safetyLevel) params.append("safetyLevel", filters.safetyLevel)

      const data = await fetchApi<{ places: IPlace[] }>(
        `/api/places?${params.toString()}`
      )
      if (requestSeq !== fetchRequestSeqRef.current) return
      lastFetchedFilterKeyRef.current = filterKey
      setPlaces(data.places || [])
      setPlacesError(null)
    } catch (error: any) {
      if (requestSeq !== fetchRequestSeqRef.current) return
      const message = error?.message || "Error al cargar lugares"
      toast.error(message)
      setPlaces([])
      setPlacesError(message)
    } finally {
      if (requestSeq === fetchRequestSeqRef.current) setLoading(false)
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
    (zoom: number, _bounds: MapViewportBounds) => {
      const params = new URLSearchParams(searchParams.toString())
      let shouldReplaceUrl = false

      const activeSearch = filters.search.trim() || debouncedSearch.trim()
      if (
        zoom < CLEAR_NEIGHBORHOOD_SEARCH_ZOOM &&
        activeSearch &&
        findKnownNeighborhoodSearch(activeSearch)
      ) {
        setFilters((current) => (
          current.search ? { ...current, search: "" } : current
        ))
        setDebouncedSearch("")
        lastSyncedUrlSearchRef.current = ""
        params.delete("search")
        shouldReplaceUrl = true
      }

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
    [citySlugsFromUrl, provinceSlugsFromUrl, localitySlugsFromUrl, debouncedSearch, filters.search, pathname, router, searchParams]
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
        fetchPlaces()
      }}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      searchQuery={debouncedSearch}
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={(place) => setSelectedPlaceId(place._id.toString())}
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

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-4rem)] flex items-center justify-center text-muted-foreground">
          Cargando mapa...
        </div>
      }
    >
      <MapaContent />
    </Suspense>
  )
}