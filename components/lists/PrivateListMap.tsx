"use client"

import { useEffect, useMemo, useRef } from "react"
import { MapboxMap, type MapboxMapRef } from "@/components/map-view/MapboxMap"
import { IPlace } from "@/models/Place"

interface PrivateListMapProps {
  places: IPlace[]
  selectedPlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
  className?: string
}

export function PrivateListMap({
  places,
  selectedPlaceId,
  onPlaceSelect,
  className,
}: PrivateListMapProps) {
  const mapRef = useRef<MapboxMapRef>(null)

  const withCoords = useMemo(
    () =>
      places.filter(
        (p) =>
          Number.isFinite(p.location?.lat) && Number.isFinite(p.location?.lng)
      ),
    [places]
  )

  useEffect(() => {
    if (!selectedPlaceId) return
    const place = withCoords.find((p) => p._id.toString() === selectedPlaceId)
    if (!place) return
    mapRef.current?.flyTo(place.location.lng, place.location.lat, 15)
  }, [selectedPlaceId, withCoords])

  if (withCoords.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-[#0c100e] text-sm text-white/55 ${className || ""}`}
      >
        Sin coordenadas para mostrar el mapa.
      </div>
    )
  }

  return (
    <div className={`relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-white/10 ${className || ""}`}>
      <MapboxMap
        ref={mapRef}
        places={withCoords}
        selectedPlaceId={selectedPlaceId}
        onPlaceSelect={onPlaceSelect}
        darkStyle
        colorBySafety
        clusterMarkers={withCoords.length > 12}
        showPopup
        enableGeolocate={false}
      />
    </div>
  )
}
