"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { IPlace } from "@/models/Place"
import { CABA_CENTER, CABA_ZOOM } from "./geo"

export const TYPE_MARKERS: Record<string, { emoji: string; bg: string; label: string }> = {
  restaurant: { emoji: "🍽️", bg: "#ea580c", label: "Restaurante" },
  cafe: { emoji: "☕", bg: "#78350f", label: "Café" },
  bakery: { emoji: "🥐", bg: "#ca8a04", label: "Panadería" },
  store: { emoji: "🛒", bg: "#16a34a", label: "Tienda" },
  icecream: { emoji: "🍦", bg: "#ec4899", label: "Heladería" },
  bar: { emoji: "🍺", bg: "#7c3aed", label: "Bar" },
  other: { emoji: "📍", bg: "#3b82f6", label: "Lugar" },
}

export interface MapboxMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  setCenter: (lng: number, lat: number) => void
}

interface MapboxMapProps {
  places: IPlace[]
  selectedPlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  darkStyle?: boolean
  reduceMotion?: boolean
}

export const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      places,
      selectedPlaceId,
      onPlaceSelect,
      onBoundsChange,
      darkStyle = true,
      reduceMotion = false,
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])
    const onBoundsChangeRef = useRef(onBoundsChange)
    onBoundsChangeRef.current = onBoundsChange

    const flyTo = useCallback(
      (lng: number, lat: number, zoom = 15) => {
        if (!map.current) return
        map.current.flyTo({
          center: [lng, lat],
          zoom,
          duration: reduceMotion ? 0 : 1000,
        })
      },
      [reduceMotion]
    )

    const setCenter = useCallback((lng: number, lat: number) => {
      if (!map.current) return
      map.current.setCenter([lng, lat])
    }, [])

    useImperativeHandle(ref, () => ({ flyTo, setCenter }), [flyTo, setCenter])

    useEffect(() => {
      if (!mapContainer.current) return

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) {
        console.error("MAPBOX_TOKEN no configurado")
        return
      }

      mapboxgl.accessToken = token

      if (!map.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: darkStyle
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/streets-v12",
          center: CABA_CENTER,
          zoom: CABA_ZOOM,
        })
      }

      return () => {}
    }, [darkStyle])

    useEffect(() => {
      const m = map.current
      if (!m || !onBoundsChange) return
      const emitBounds = () => onBoundsChangeRef.current?.(m.getBounds())
      m.on("load", emitBounds)
      m.on("moveend", emitBounds)
      return () => {
        m.off("load", emitBounds)
        m.off("moveend", emitBounds)
      }
    }, [onBoundsChange])

    useEffect(() => {
      if (!map.current) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      places.forEach((place) => {
        const config = TYPE_MARKERS[place.type] || TYPE_MARKERS.other
        const isSelected = selectedPlaceId === place._id.toString()

        const el = document.createElement("div")
        el.className = "mapboxgl-marker"
        el.style.cssText = `
          width: ${isSelected ? 44 : 36}px;
          height: ${isSelected ? 44 : 36}px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        `
        const inner = document.createElement("div")
        inner.style.cssText = `
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${config.bg};
          border: ${isSelected ? "3px" : "2px"} solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          transform-origin: center center;
        `
        inner.innerHTML = `<span style="font-size: ${isSelected ? 20 : 16}px; line-height: 1;">${config.emoji}</span>`

        el.appendChild(inner)

        el.addEventListener("click", () => {
          onPlaceSelect?.(place)
        })

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([place.location.lng, place.location.lat])
          .addTo(map.current!)

        markersRef.current.push(marker)
      })

      return () => {
        markersRef.current.forEach((m) => m.remove())
      }
    }, [places, selectedPlaceId, onPlaceSelect])

    useEffect(() => {
      if (!map.current || !selectedPlaceId) return
      const place = places.find((p) => p._id.toString() === selectedPlaceId)
      if (place) {
        map.current.flyTo({
          center: [place.location.lng, place.location.lat],
          zoom: 15,
          duration: reduceMotion ? 0 : 1000,
        })
      }
    }, [selectedPlaceId, places, reduceMotion])

    return <div ref={mapContainer} className="w-full h-full" />
  }
)

MapboxMap.displayName = "MapboxMap"
