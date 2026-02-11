"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { reverseGeocode } from "@/lib/geocode"
import type { GeocodeResult } from "@/lib/geocode"
import { CABA_CENTER, CABA_ZOOM } from "@/components/map-view/geo"
import { Loader2, MapPin } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: GeocodeResult) => void
}

export function MapPickerModal({ open, onOpenChange, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !mapContainer.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setError("Mapa no configurado")
      return
    }

    mapboxgl.accessToken = token

    setPicked(null)
    setError("")
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: CABA_CENTER,
      zoom: CABA_ZOOM,
    })
    map.current = mapInstance

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      setPicked({ lat, lng })

      if (markerRef.current) markerRef.current.remove()
      const el = document.createElement("div")
      el.innerHTML = `<div style="
        width: 32px; height: 32px;
        background: #10b981; border: 3px solid white;
        border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center;
      "><span style="font-size: 16px;">📍</span></div>`
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapInstance)
    }

    mapInstance.on("click", handleClick)

    return () => {
      mapInstance.remove()
      map.current = null
    }
  }, [open])

  const handleConfirm = async () => {
    if (!picked) {
      setError("Hacé click en el mapa para marcar la ubicación")
      return
    }
    setGeocoding(true)
    setError("")
    try {
      const result = await reverseGeocode(picked.lat, picked.lng)
      if (result) {
        onSelect(result)
        onOpenChange(false)
      } else {
        setError("No se pudo obtener la dirección. Probá otra ubicación.")
      }
    } catch {
      setError("Error al obtener la dirección")
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Marcá la ubicación en el mapa
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            Hacé click en el mapa donde está el lugar. Luego confirmá para usar esa ubicación.
          </p>
        </DialogHeader>
        <div className="relative">
          <div ref={mapContainer} className="h-[400px] w-full" />
          {picked && (
            <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 bg-black/60 px-3 py-2 rounded-lg">
              📍 {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)} — Hacé click en &quot;Confirmar&quot; para usar
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive px-6">{error}</p>
        )}
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={geocoding}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={geocoding || !picked}>
            {geocoding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Obteniendo dirección...
              </>
            ) : (
              "Confirmar ubicación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
