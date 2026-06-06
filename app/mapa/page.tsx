"use client"

import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { MapViewportBounds } from "@/components/map-view/MapboxMap"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { findKnownNeighborhoodSearch } from "@/lib/map-search"
import { toast } from "sonner"

const SEARCH_DEBOUNCE_MS = 650
const MIN_SEARCH_LENGTH = 2
const VIEWPORT_DEBOUNCE_MS = 250
const CHUNK_ZOOM_THRESHOLD = 7
const MAP_PLACES_LIMIT = 5000
const BBOX_PADDING_RATIO = 0.2

interface MapViewport {
  zoom: number
  bounds: MapViewportBounds
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function expandBounds(bounds: MapViewportBounds): MapViewportBounds {
  const lngPadding = Math.abs(bounds.east - bounds.west) * BBOX_PADDING_RATIO
  const latPadding = Math.abs(bounds.north - bounds.south) * BBOX_PADDING_RATIO

  return {
    west: clamp(bounds.west - lngPadding, -180, 180),
    south: clamp(bounds.south - latPadding, -90, 90),
    east: clamp(bounds.east + lngPadding, -180, 180),
    north: clamp(bounds.north + latPadding, -90, 90),
  }
}

function formatBbox(bounds: MapViewportBounds): string {
  return [bounds.west, bounds.south, bounds.east, bounds.north]
    .map((value) => value.toFixed(6))
    .join(",")
}

function boundsContain(outer: MapViewportBounds, inner: MapViewportBounds): boolean {
  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  )
}

function MapaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const placeIdFromUrl = searchParams.get("place")
  const listOpen = searchParams.get("list") === "open"
  const citySlugsFromUrl = searchParams.get("citySlugs")
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
  const [viewport, setViewport] = useState<MapViewport | null>(null)
  const [debouncedViewport, setDebouncedViewport] = useState<MapViewport | null>(null)
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
  const lastFetchedViewportRef = useRef<{
    bounds: MapViewportBounds | null
    filterKey: string
  } | null>(null)

  // Sincronizar URL ?search= con el estado cuando cambia la URL
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
    const t = setTimeout(() => setDebouncedViewport(viewport), VIEWPORT_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [viewport])

  // Actualizar la URL cuando cambia el search (para que refresh/back mantenga la búsqueda)
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
    if (!debouncedViewport) return

    const search = debouncedSearch.trim()
    const searchNeighborhood = findKnownNeighborhoodSearch(search)
    const freeTextSearch = searchNeighborhood ? "" : search
    const effectiveNeighborhood = searchNeighborhood ?? filters.neighborhood ?? ""
    const filterKey = JSON.stringify({
      citySlugs: searchNeighborhood ? "" : citySlugsFromUrl ?? "",
      search: freeTextSearch,
      type: filters.type ?? "",
      neighborhood: effectiveNeighborhood,
      tags: [...(filters.tags ?? [])].sort(),
      safetyLevel: filters.safetyLevel ?? "",
    })
    const shouldUseBbox = !searchNeighborhood && !freeTextSearch && debouncedViewport.zoom >= CHUNK_ZOOM_THRESHOLD
    const expandedViewportBounds = shouldUseBbox
      ? expandBounds(debouncedViewport.bounds)
      : null
    const lastFetch = lastFetchedViewportRef.current

    if (lastFetch?.filterKey === filterKey) {
      if (searchNeighborhood || freeTextSearch) return
      if (!expandedViewportBounds && lastFetch.bounds === null) return
      if (
        expandedViewportBounds &&
        lastFetch.bounds &&
        boundsContain(lastFetch.bounds, debouncedViewport.bounds)
      ) {
        return
      }
    }

    const requestSeq = fetchRequestSeqRef.current + 1
    fetchRequestSeqRef.current = requestSeq
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", String(MAP_PLACES_LIMIT))
      if (expandedViewportBounds) {
        params.append("bbox", formatBbox(expandedViewportBounds))
      }
      if (citySlugsFromUrl && !searchNeighborhood) params.append("citySlugs", citySlugsFromUrl)
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
      lastFetchedViewportRef.current = {
        bounds: expandedViewportBounds,
        filterKey,
      }
      setPlaces(data.places || [])
    } catch (error: any) {
      if (requestSeq !== fetchRequestSeqRef.current) return
      toast.error(error?.message || "Error al cargar lugares")
      setPlaces([])
    } finally {
      if (requestSeq === fetchRequestSeqRef.current) setLoading(false)
    }
  }, [
    citySlugsFromUrl,
    debouncedSearch,
    debouncedViewport,
    filters.type,
    filters.neighborhood,
    filters.tags,
    filters.safetyLevel,
  ])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  // Sincronizar ?place= con selectedPlaceId
  useEffect(() => {
    if (placeIdFromUrl) setSelectedPlaceId(placeIdFromUrl)
  }, [placeIdFromUrl])

  /** Al hacer zoom out (nivel < 8), quitar filtro de ciudad para mostrar todo el país */
  const handleMapMoveEnd = useCallback(
    (zoom: number, bounds: MapViewportBounds) => {
      setViewport({ zoom, bounds })
      if (!citySlugsFromUrl || zoom >= 8) return
      const params = new URLSearchParams(searchParams.toString())
      params.delete("citySlugs")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [citySlugsFromUrl, pathname, router, searchParams]
  )

  const handleSheetCollapse = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("list")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <MapScreen
      places={places}
      loading={loading}
      filters={filters}
      onFiltersChange={setFilters}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      searchQuery={debouncedSearch}
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={(place) => setSelectedPlaceId(place._id.toString())}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      placeIdToFocus={placeIdFromUrl}
      listOpen={listOpen}
      onSheetCollapse={handleSheetCollapse}
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
