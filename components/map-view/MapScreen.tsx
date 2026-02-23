"use client"

import { MapMobile } from "./MapMobile"
import { MapDesktop } from "./MapDesktop"
import { useIsMobile } from "./useMediaQuery"
import type { MapFilters } from "./MapTopBar"
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
  /** ID de lugar para centrar el mapa (ej. desde ?place=id) */
  placeIdToFocus?: string | null
  /** Si true, el BottomSheet empieza abierto (desde ?list=open) */
  listOpen?: boolean
  /** Callback cuando el usuario cierra el sheet manualmente */
  onSheetCollapse?: () => void
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
  placeIdToFocus,
  listOpen,
  onSheetCollapse,
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
        placeIdToFocus={placeIdToFocus}
        listOpen={listOpen}
        onSheetCollapse={onSheetCollapse}
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
    />
  )
}
