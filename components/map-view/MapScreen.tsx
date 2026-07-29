"use client"

import { MapMobile } from "./MapMobile"
import { MapDesktop } from "./MapDesktop"
import { useIsMobile } from "./useMediaQuery"
import type { MapFilters } from "./MapTopBar"
import type { MapViewportBounds } from "./MapboxMap"
import type { IPlace } from "@/models/Place"

interface MapScreenProps {
  places: IPlace[]
  loading: boolean
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

  if (isMobile) {
    return (
      <MapMobile
        places={places}
        loading={loading}
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
    )
  }

  return (
    <MapDesktop
      places={places}
      loading={loading}
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
  )
}
