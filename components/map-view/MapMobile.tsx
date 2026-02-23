"use client"

import * as React from "react"
import { MapboxMap, type MapboxMapRef } from "./MapboxMap"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { MapBottomSheet, type SheetSnap } from "./BottomSheet"
import { PlacesList } from "./PlacesList"
import { FabButtons } from "./FabButtons"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { toast } from "sonner"
import mapboxgl from "mapbox-gl"
import { CABA_CENTER, filterPlacesInBounds } from "./geo"
import type { IPlace } from "@/models/Place"

interface MapMobileProps {
  places: IPlace[]
  loading: boolean
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  searchQuery?: string
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
  placeIdToFocus?: string | null
  /** Si true, el BottomSheet empieza abierto (desde ?list=open) */
  listOpen?: boolean
  /** Callback cuando el usuario cierra el sheet manualmente */
  onSheetCollapse?: () => void
}

export function MapMobile({
  places,
  loading,
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery,
  selectedPlaceId,
  onPlaceSelect,
  placeIdToFocus,
  listOpen = false,
  onSheetCollapse,
}: MapMobileProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const [bounds, setBounds] = React.useState<mapboxgl.LngLatBounds | null>(null)

  const visiblePlaces = React.useMemo(() => {
    if (!bounds) return places
    const inBounds = filterPlacesInBounds(places, bounds)
    if (!selectedPlaceId) return inBounds
    const selected = places.find((p) => p._id.toString() === selectedPlaceId)
    if (selected && !inBounds.some((p) => p._id.toString() === selectedPlaceId)) {
      return [selected, ...inBounds]
    }
    return inBounds
  }, [places, bounds, selectedPlaceId])

  const goToNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización")
      return
    }
    toast.loading("Obteniendo tu ubicación...", { id: "location" })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapRef.current?.flyTo(longitude, latitude, 14)
        toast.success("Ubicación encontrada", { id: "location" })
      },
      (err) => {
        if (err.code === 1) {
          toast.error("Permití el acceso a la ubicación para ver lugares cerca tuyo", { id: "location" })
        } else {
          toast.error("No se pudo obtener tu ubicación. Revisá que el GPS esté activado.", { id: "location" })
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handlePlaceSelect = (place: IPlace) => {
    onPlaceSelect(place)
  }

  const handleSnapChange = React.useCallback(
    (snap: SheetSnap) => {
      if (snap === "collapsed") onSheetCollapse?.()
    },
    [onSheetCollapse]
  )

  // Centrar mapa en lugar cuando placeIdToFocus está en la lista
  React.useEffect(() => {
    if (!placeIdToFocus || !mapRef.current) return
    const place = places.find((p) => p._id.toString() === placeIdToFocus)
    if (place?.location) {
      mapRef.current.flyTo(place.location.lng, place.location.lat, 15)
    }
  }, [placeIdToFocus, places])

  return (
    <div className="relative w-full h-full min-h-[100dvh] overflow-hidden">
      <MapTopBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
      />

      <div className="absolute inset-0 pt-[calc(120px+env(safe-area-inset-top))]">
        <MapboxMap
          ref={mapRef}
          places={places}
          selectedPlaceId={selectedPlaceId ?? undefined}
          onPlaceSelect={handlePlaceSelect}
          onBoundsChange={setBounds}
          searchQuery={searchQuery}
          darkStyle
          reduceMotion={reduceMotion}
        />
      </div>

      <FabButtons
        onNearMe={goToNearMe}
        bottomOffset={listOpen ? "calc(18vh + 1rem)" : "calc(5rem + 1rem + env(safe-area-inset-bottom))"}
      />

      {listOpen && (
        <MapBottomSheet
          initialSnap="half"
          onSnapChange={handleSnapChange}
          reduceMotion={reduceMotion}
        >
          <div className="pt-2">
            <PlacesList
              places={visiblePlaces}
              selectedPlaceId={selectedPlaceId}
              loading={loading}
            />
          </div>
        </MapBottomSheet>
      )}
    </div>
  )
}
