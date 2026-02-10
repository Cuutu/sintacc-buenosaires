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
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
}

export function MapScreen({
  places,
  loading,
  filters,
  onFiltersChange,
  onSearchChange,
  selectedPlaceId,
  onPlaceSelect,
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
        selectedPlaceId={selectedPlaceId}
        onPlaceSelect={onPlaceSelect}
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
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={onPlaceSelect}
    />
  )
}
