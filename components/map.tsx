"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { IPlace } from "@/models/Place"

export const TYPE_MARKERS: Record<string, { emoji: string; bg: string; label: string }> = {
  restaurant: { emoji: "🍽️", bg: "#ea580c", label: "Restaurante" },
  cafe: { emoji: "☕", bg: "#78350f", label: "Café" },
  bakery: { emoji: "🥐", bg: "#ca8a04", label: "Panadería" },
  store: { emoji: "🛒", bg: "#16a34a", label: "Tienda" },
  icecream: { emoji: "🍦", bg: "#ec4899", label: "Heladería" },
  bar: { emoji: "🍺", bg: "#7c3aed", label: "Bar" },
  other: { emoji: "📍", bg: "#3b82f6", label: "Lugar" },
}

interface MapProps {
  places: IPlace[]
  initialCenter?: [number, number]
  initialZoom?: number
  selectedPlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
}

export function Map({
  places,
  initialCenter = [-58.3816, -34.6037],
  initialZoom = 12,
  selectedPlaceId,
  onPlaceSelect,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null)

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
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom: initialZoom,
      })
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add markers
    places.forEach((place) => {
      const config = TYPE_MARKERS[place.type] || TYPE_MARKERS.other

      const el = document.createElement("div")
      el.className = "mapboxgl-marker"
      el.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${config.bg};
        border: 2px solid white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        transition: transform 0.2s ease;
      `
      el.innerHTML = `<span style="font-size: 16px; line-height: 1;">${config.emoji}</span>`

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)"
      })
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)"
      })

      const marker = new mapboxgl.Marker(el)
        .setLngLat([place.location.lng, place.location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 12px; min-width: 200px;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; color: white; margin-bottom: 8px; background: ${config.bg}">${config.emoji} ${config.label}</span>
              <h3 style="font-weight: 700; font-size: 14px; margin: 0;">${place.name}</h3>
              <p style="font-size: 12px; color: #6b7280; margin: 6px 0 0 0;">${place.address}</p>
            </div>`
          )
        )
        .addTo(map.current!)

      el.addEventListener("click", () => {
        setSelectedPlace(place)
        onPlaceSelect?.(place)
      })

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
    }
  }, [places, initialCenter, initialZoom, onPlaceSelect])

  useEffect(() => {
    if (!map.current || !selectedPlaceId) return
    const place = places.find((p) => p._id.toString() === selectedPlaceId)
    if (place) {
      map.current.flyTo({
        center: [place.location.lng, place.location.lat],
        zoom: 15,
        duration: 1000,
      })
      setSelectedPlace(place)
    }
  }, [selectedPlaceId, places])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Leyenda de iconos */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold mb-2 text-muted-foreground">Tipos de lugares</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_MARKERS).map(([key, { emoji, label }]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50"
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {selectedPlace && (
        <div className="absolute top-4 right-4 z-10 max-w-sm">
          <Card>
            <CardContent className="p-4">
              <Link href={`/lugar/${selectedPlace._id}`}>
                <h3 className="font-bold text-lg mb-2">{selectedPlace.name}</h3>
              </Link>
              <p className="text-sm text-muted-foreground mb-2">{selectedPlace.address}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedPlace.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-sm text-primary hover:underline"
              >
                Cerrar
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
