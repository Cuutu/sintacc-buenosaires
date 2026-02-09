"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MapPin } from "lucide-react"
import { IPlace } from "@/models/Place"

interface MapProps {
  places: IPlace[]
  initialCenter?: [number, number]
  initialZoom?: number
}

export function Map({ places, initialCenter = [-58.3816, -34.6037], initialZoom = 12 }: MapProps) {
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
      const el = document.createElement("div")
      el.className = "marker"
      el.style.width = "30px"
      el.style.height = "30px"
      el.style.borderRadius = "50%"
      el.style.backgroundColor = "#3b82f6"
      el.style.border = "2px solid white"
      el.style.cursor = "pointer"

      const marker = new mapboxgl.Marker(el)
        .setLngLat([place.location.lng, place.location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-bold">${place.name}</h3>
              <p class="text-sm text-gray-600">${place.address}</p>
            </div>`
          )
        )
        .addTo(map.current!)

      el.addEventListener("click", () => {
        setSelectedPlace(place)
      })

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
    }
  }, [places, initialCenter, initialZoom])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
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
