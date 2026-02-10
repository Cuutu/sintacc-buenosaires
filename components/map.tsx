"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { PlaceDetailModal } from "@/components/place-detail-modal"
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
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    places.forEach((place) => {
      const config = TYPE_MARKERS[place.type] || TYPE_MARKERS.other

      const el = document.createElement("div")
      el.className = "mapboxgl-marker"
      el.style.cssText = `
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `
      const inner = document.createElement("div")
      inner.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${config.bg};
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
        transform-origin: center center;
      `
      inner.innerHTML = `<span style="font-size: 16px; line-height: 1;">${config.emoji}</span>`

      el.appendChild(inner)

      inner.addEventListener("mouseenter", () => {
        inner.style.transform = "scale(1.15)"
      })
      inner.addEventListener("mouseleave", () => {
        inner.style.transform = "scale(1)"
      })

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: "celimap-popup",
      }).setHTML(
        `<div style="background:#1a1a1f;padding:14px;min-width:220px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
          <span style="display:inline-block;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;color:#fff;margin-bottom:10px;background:${config.bg}">${config.emoji} ${config.label}</span>
          <h3 style="font-weight:700;font-size:14px;margin:0;color:#f5f5f5;">${place.name}</h3>
          <p style="font-size:12px;color:#a1a1aa;margin:8px 0 0 0;">${place.address}</p>
        </div>`
      )

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([place.location.lng, place.location.lat])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener("click", () => {
        setModalPlaceId(place._id.toString())
        setModalOpen(true)
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
      setModalPlaceId(selectedPlaceId)
      setModalOpen(true)
    }
  }, [selectedPlaceId, places])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Leyenda de iconos */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg text-xs border border-border/50">
        <p className="font-semibold mb-2 text-muted-foreground">Tipos de lugares</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_MARKERS).map(([key, { emoji, label }]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-foreground"
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      <PlaceDetailModal
        placeId={modalPlaceId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
