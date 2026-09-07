"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { X } from "lucide-react"
import { MapboxMap, type MapboxMapRef, type MapViewportBounds } from "./MapboxMap"
import { MapErrorBoundary } from "./MapErrorBoundary"
import { MapTopBar, type MapFilters, type SortOption } from "./MapTopBar"
import { PlacesList } from "./PlacesList"
import { DesktopMapPopover } from "./DesktopMapPopover"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { useUserLocation } from "./useUserLocation"
import { filterPlacesInBounds } from "./geo"
import { listHasRatings, sortPlaces } from "./place-sort"
import type { IPlace } from "@/models/Place"

interface MapDesktopProps {
  places: IPlace[]
  loading: boolean
  loadError?: string | null
  onRetryLoad?: () => void
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  searchQuery?: string
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
  onPlaceDeselect?: () => void
  initialCenter?: [number, number]
  initialZoom?: number
  onMapMoveEnd?: (zoom: number, bounds: MapViewportBounds) => void
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Otro",
}

export function MapDesktop({
  places,
  loading,
  loadError = null,
  onRetryLoad,
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery,
  selectedPlaceId,
  onPlaceSelect,
  onPlaceDeselect,
  initialCenter,
  initialZoom,
  onMapMoveEnd,
}: MapDesktopProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const [bounds, setBounds] = React.useState<mapboxgl.LngLatBounds | null>(null)
  const location = useUserLocation()
  const [sort, setSort] = React.useState<SortOption>("recommended")
  const sortInitializedRef = React.useRef(false)
  const [mapKey, setMapKey] = React.useState(0)
  const [hoveredPlaceId, setHoveredPlaceId] = React.useState<string | null>(null)
  const [popoverPlace, setPopoverPlace] = React.useState<IPlace | null>(null)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  React.useEffect(() => {
    if (sortInitializedRef.current) return
    if (location.status === "unknown") return
    sortInitializedRef.current = true
    if (location.status === "granted") setSort("nearest")
  }, [location.status])

  React.useEffect(() => {
    if (sort !== "nearest") return
    if (location.status === "granted" && location.coords) return
    if (location.status === "prompt" || location.status === "unknown") {
      location.request()
      return
    }
    if (location.status === "denied" || location.status === "error" || location.status === "unavailable") {
      setSort("recommended")
    }
  }, [sort, location.status, location.coords, location.request])

  const activeFilters = React.useMemo(() => {
    const parts: string[] = []
    if (filters.safetyLevel === "dedicated_gf") parts.push("100% sin TACC")
    if (filters.safetyLevel === "gf_options") parts.push("Tiene opciones")
    if (filters.type) parts.push(TYPE_LABELS[filters.type] ?? filters.type)
    if (filters.tags.includes("certificado_sin_tacc")) parts.push("Insumos certificados")
    if (filters.tags.includes("cocina_separada")) parts.push("Cocina separada")
    if (filters.tags.includes("delivery")) parts.push("Delivery")
    return parts
  }, [filters])

  const hasActiveFilters = activeFilters.length > 0

  const clearAllFilters = () => {
    onFiltersChange({
      search: filters.search,
      tags: [],
      type: undefined,
      neighborhood: undefined,
      safetyLevel: undefined,
    })
  }

  const visiblePlaces = React.useMemo(() => {
    if (searchQuery?.trim()) return places
    if (!bounds) return places
    const inBounds = filterPlacesInBounds(places, bounds)
    if (!selectedPlaceId) return inBounds
    const selected = places.find((place) => place._id.toString() === selectedPlaceId)
    if (selected && !inBounds.some((place) => place._id.toString() === selectedPlaceId)) {
      return [selected, ...inBounds]
    }
    return inBounds
  }, [places, bounds, selectedPlaceId, searchQuery])

  const sortedPlaces = React.useMemo(
    () => sortPlaces(visiblePlaces, sort, location.coords),
    [visiblePlaces, sort, location.coords]
  )
  const hasRatings = React.useMemo(() => listHasRatings(visiblePlaces), [visiblePlaces])
  const activeQuery = searchQuery?.trim() ?? ""
  const showLocationCta = sort === "nearest" && !location.coords && location.status !== "denied"

  const selectedPlace = React.useMemo(
    () => places.find((place) => place._id.toString() === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

  React.useEffect(() => {
    if (selectedPlace) {
      setPopoverPlace(selectedPlace)
      setPopoverOpen(true)
      return
    }
    setPopoverOpen(false)
    if (!popoverPlace) return
    const timer = window.setTimeout(() => setPopoverPlace(null), reduceMotion ? 0 : 280)
    return () => window.clearTimeout(timer)
  }, [selectedPlace, popoverPlace, reduceMotion])

  return (
    <div className="flex h-full w-full bg-cream">
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <MapErrorBoundary
          key={mapKey}
          onRetry={() => setMapKey((k) => k + 1)}
        >
          <MapboxMap
            ref={mapRef}
            places={places}
            selectedPlaceId={selectedPlaceId ?? undefined}
            hoveredPlaceId={hoveredPlaceId}
            onPlaceSelect={onPlaceSelect}
            onBackgroundClick={onPlaceDeselect}
            onBoundsChange={setBounds}
            onMoveEnd={onMapMoveEnd}
            searchQuery={searchQuery}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            reduceMotion={reduceMotion}
            clusterMarkers
            colorBySafety
            showPopup={false}
          />
        </MapErrorBoundary>

        {popoverPlace && (
          <DesktopMapPopover
            place={popoverPlace}
            mapRef={mapRef}
            closing={!popoverOpen}
            onClose={() => onPlaceDeselect?.()}
          />
        )}

        {hasActiveFilters && (
          <div className="pointer-events-auto absolute left-1/2 top-4 z-10 -translate-x-1/2">
            <div className="flex max-w-[540px] items-center gap-2 overflow-hidden rounded-full border border-olive/15 bg-cream/90 px-3 py-2 text-xs font-medium text-olive shadow-[0_8px_24px_rgba(31,77,53,0.12)] backdrop-blur-2xl">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="truncate">
                {sortedPlaces.length} lugar{sortedPlaces.length !== 1 ? "es" : ""} · {activeFilters.join(" · ")}
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 shrink-0 text-muted-foreground transition hover:text-olive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                title="Limpiar filtros"
                aria-label="Limpiar filtros"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="flex w-[min(480px,40vw)] min-w-[440px] max-w-[520px] shrink-0 flex-col overflow-hidden border-l border-olive/10 bg-cream">
        <MapTopBar
          variant="sidebar"
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          sort={sort}
          onSortChange={setSort}
          resultCount={sortedPlaces.length}
          activeQuery={activeQuery}
          onClearQuery={activeQuery ? () => onSearchChange("") : undefined}
          hasRatings={hasRatings}
          locationCta={showLocationCta ? "Usar mi ubicación para ordenar por cercanía" : null}
          onRequestLocation={location.request}
          locationMessage={location.message}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          placeholder="Buscar lugar o zona..."
        />

        <div className="min-h-0 flex-1 overflow-y-auto pt-1">
          <PlacesList
            places={sortedPlaces}
            selectedPlaceId={selectedPlaceId}
            loading={loading}
            loadError={loadError}
            onRetryLoad={onRetryLoad}
            onPlaceSelect={onPlaceSelect}
            onPlaceHover={setHoveredPlaceId}
            onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
            userLocation={location.coords}
            locationCta={showLocationCta ? "Usar mi ubicación para ordenar por cercanía" : null}
            onRequestLocation={location.request}
            locationMessage={location.message}
          />
        </div>
      </aside>
    </div>
  )
}
