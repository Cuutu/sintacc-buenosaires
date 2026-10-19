"use client"

import * as React from "react"
import type mapboxgl from "mapbox-gl"
import { X } from "lucide-react"
import type { MapboxMapRef, MapViewportBounds } from "./MapboxMap"
import { MapboxMapLazy as MapboxMap } from "./MapboxMapLazy"
import { MapErrorBoundary } from "./MapErrorBoundary"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { PlacesList } from "./PlacesList"
import { DesktopMapPopover } from "./DesktopMapPopover"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { useUserLocation } from "./useUserLocation"
import { filterPlacesInBounds } from "./geo"
import { listHasRatings, sortPlaces, LOCATION_SORT_CTA } from "./place-sort"
import { useMapPlaceSort } from "./useMapPlaceSort"
import type { IPlace } from "@/models/Place"
import type { MapSearchPin } from "@/lib/map-address-search"
import { safetyModeFromTags } from "@/lib/safety-mode"
import { cn } from "@/lib/utils"

interface MapDesktopProps {
  places: IPlace[]
  loading: boolean
  loadError?: string | null
  onRetryLoad?: () => void
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  searchQuery?: string
  searchPin?: MapSearchPin | null
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
  searchPin = null,
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
  const { sort, setSort, showLocationCta } = useMapPlaceSort(location)
  const [mapKey, setMapKey] = React.useState(0)
  const [hoveredPlaceId, setHoveredPlaceId] = React.useState<string | null>(null)
  const [popoverPlace, setPopoverPlace] = React.useState<IPlace | null>(null)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const safetyMode = safetyModeFromTags(filters.tags)
  const activeFilters = React.useMemo(() => {
    const parts: string[] = []
    if (safetyMode === "cien") parts.push("100% sin TACC")
    if (safetyMode === "opc") parts.push("Tiene opciones")
    if (filters.type) parts.push(TYPE_LABELS[filters.type] ?? filters.type)
    if (filters.tags.includes("certificado_sin_tacc")) parts.push("Insumos certificados")
    if (filters.tags.includes("cocina_separada")) parts.push("Cocina separada")
    if (filters.tags.includes("delivery")) parts.push("Delivery")
    return parts
  }, [filters, safetyMode])

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
  // Chip de búsqueda: en modo dirección el texto no filtra, pero se puede quitar igual.
  const queryChip = searchPin?.query ?? activeQuery
  const locationCta = showLocationCta ? LOCATION_SORT_CTA : null

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
            searchPin={searchPin}
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
              {/* Mismo código de color que los pines: verde = 100%, terracota = con opciones. */}
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  safetyMode === "cien" ? "bg-[#1F4D35]" : safetyMode === "opc" ? "bg-[#C85A2E]" : "bg-olive/40"
                )}
              />
              <span className="truncate">
                {loading ? null : `${sortedPlaces.length} lugar${sortedPlaces.length !== 1 ? "es" : ""} · `}
                {activeFilters.join(" · ")}
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
          resultCount={loading ? undefined : sortedPlaces.length}
          resultCountLabel={loading ? "Buscando lugares en esta zona…" : undefined}
          activeQuery={queryChip}
          onClearQuery={queryChip ? () => onSearchChange("") : undefined}
          hasRatings={hasRatings}
          locationCta={locationCta}
          onRequestLocation={() => setSort("nearest")}
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
          />
        </div>
      </aside>
    </div>
  )
}
