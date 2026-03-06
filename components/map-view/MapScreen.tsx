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
  /** Centro inicial [lng, lat] del mapa */
  initialCenter?: [number, number]
  /** Zoom inicial del mapa */
  initialZoom?: number
  /** ID de lugar para centrar el mapa (ej. desde ?place=id) */
  placeIdToFocus?: string | null
  /** Si true, el BottomSheet empieza abierto (desde ?list=open) */
  listOpen?: boolean
  /** Callback cuando el usuario cierra el sheet manualmente */
  onSheetCollapse?: () => void
  /** Llamado al hacer zoom/pan con el nivel de zoom actual */
  onMapMoveEnd?: (zoom: number) => void
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
