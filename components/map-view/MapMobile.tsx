"use client"

import * as React from "react"
import { MapboxMap, type MapboxMapRef } from "./MapboxMap"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { MapBottomSheet, type SheetSnap } from "./BottomSheet"
import { PlacesList } from "./PlacesList"
import { FabButtons } from "./FabButtons"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { CABA_CENTER } from "./geo"
import type { IPlace } from "@/models/Place"

interface MapMobileProps {
  places: IPlace[]
  loading: boolean
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
}

export function MapMobile({
  places,
  loading,
  filters,
  onFiltersChange,
  onSearchChange,
  selectedPlaceId,
  onPlaceSelect,
}: MapMobileProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const [sheetSnap, setSheetSnap] = React.useState<SheetSnap>("half")

  const goToNearMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapRef.current?.flyTo(longitude, latitude, 14)
      },
      () => {}
    )
  }

  const goToRecenter = () => {
    mapRef.current?.flyTo(CABA_CENTER[0], CABA_CENTER[1], 12)
  }

  const handlePlaceSelect = (place: IPlace) => {
    onPlaceSelect(place)
    if (sheetSnap === "collapsed") {
      setSheetSnap("half")
    }
  }

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
          darkStyle
          reduceMotion={reduceMotion}
        />
      </div>

      <FabButtons
        onNearMe={goToNearMe}
        onRecenter={goToRecenter}
        bottomOffset="calc(18vh + 1rem)"
      />

      <MapBottomSheet
        initialSnap="half"
        onSnapChange={setSheetSnap}
        reduceMotion={reduceMotion}
      >
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-3 px-4">
            Resultados
            <span className="text-muted-foreground font-normal ml-2">
              {places.length} lugar{places.length !== 1 ? "es" : ""}
            </span>
          </h2>
          <PlacesList
            places={places}
            selectedPlaceId={selectedPlaceId}
            loading={loading}
          />
        </div>
      </MapBottomSheet>
    </div>
  )
}
