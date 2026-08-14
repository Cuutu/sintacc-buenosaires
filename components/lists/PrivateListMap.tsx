"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MapboxMap, type MapboxMapRef } from "@/components/map-view/MapboxMap"
import { IPlace } from "@/models/Place"

interface PrivateListMapProps {
  places: IPlace[]
  activePlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
  className?: string
  /** Ref opcional para fitAllPlaces desde el padre */
  mapRefOuter?: React.MutableRefObject<MapboxMapRef | null>
}

export function PrivateListMap({
  places,
  activePlaceId,
  onPlaceSelect,
  className,
  mapRefOuter,
}: PrivateListMapProps) {
  const mapRef = useRef<MapboxMapRef>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  const withCoords = useMemo(
    () =>
      places.filter(
        (p) =>
          Number.isFinite(p.location?.lat) && Number.isFinite(p.location?.lng)
      ),
    [places]
  )

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
  }, [])

  useEffect(() => {
    if (!mapRefOuter) return
    const api = mapRef.current
    mapRefOuter.current = api
    return () => {
      if (mapRefOuter.current === api) {
        mapRefOuter.current = null
      }
    }
  })

  if (withCoords.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-olive/10 bg-card text-sm text-muted-foreground ${className || ""}`}
      >
        Sin coordenadas para mostrar el mapa.
      </div>
    )
  }

  return (
    <div
      className={`relative h-full min-h-[300px] overflow-hidden rounded-2xl border border-olive/10 ${className || ""}`}
    >
      <MapboxMap
        ref={mapRef}
        places={withCoords}
        selectedPlaceId={activePlaceId}
        onPlaceSelect={onPlaceSelect}
        interactionMode="private-guide"
        numberedMarkers
        showPopup={false}
        darkStyle
        colorBySafety
        clusterMarkers={false}
        enableGeolocate={false}
        reduceMotion={reduceMotion}
      />
    </div>
  )
}
