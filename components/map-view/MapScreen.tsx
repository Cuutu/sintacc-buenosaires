"use client"

import { MapMobile } from "./MapMobile"
import { MapDesktop } from "./MapDesktop"
import { resolveMapVariant, useIsMobile } from "./useMediaQuery"
import type { MapFilters } from "./MapTopBar"
import type { MapViewportBounds } from "./MapboxMap"
import type { IPlace } from "@/models/Place"

interface MapScreenProps {
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
  initialCenter?: [number, number]
  initialZoom?: number
  placeIdToFocus?: string | null
  listOpen?: boolean
  onSheetCollapse?: () => void
  onListOpen?: () => void
  onMapMoveEnd?: (zoom: number, bounds: MapViewportBounds) => void
}

export function MapScreen({
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
  initialCenter,
  initialZoom,
  placeIdToFocus,
  listOpen,
  onSheetCollapse,
  onListOpen,
  onMapMoveEnd,
}: MapScreenProps) {
  const isMobile = useIsMobile()
  const variant = resolveMapVariant(isMobile)

  // Una sola variante: loading | mobile | desktop — nunca Desktop+Mobile juntos
  if (variant === "loading") {
    return (
      <div
        className="flex h-full min-h-[50vh] w-full items-center justify-center bg-cream text-sm text-muted-foreground"
        aria-busy
        aria-label="Cargando mapa"
        data-map-variant="loading"
      >
        Cargando mapa…
      </div>
    )
  }

  if (variant === "mobile") {
    return (
      <div className="h-full w-full" data-map-variant="mobile">
        <MapMobile
          places={places}
          loading={loading}
          loadError={loadError}
          onRetryLoad={onRetryLoad}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          searchQuery={searchQuery}
          selectedPlaceId={selectedPlaceId}
          onPlaceSelect={onPlaceSelect}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          placeIdToFocus={placeIdToFocus}
          listOpen={listOpen}
          onSheetCollapse={onSheetCollapse}
          onListOpen={onListOpen}
          onMapMoveEnd={onMapMoveEnd}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full" data-map-variant="desktop">
      <MapDesktop
        places={places}
        loading={loading}
        loadError={loadError}
        onRetryLoad={onRetryLoad}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        searchQuery={searchQuery}
        selectedPlaceId={selectedPlaceId}
        onPlaceSelect={onPlaceSelect}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        onMapMoveEnd={onMapMoveEnd}
      />
    </div>
  )
}
