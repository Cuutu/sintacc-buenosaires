"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { reverseGeocode } from "@/lib/geocode"
import type { GeocodeResult } from "@/lib/geocode"
import { CABA_CENTER, CABA_ZOOM } from "@/components/map-view/geo"
import { Loader2, MapPin, X } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: GeocodeResult) => void
}

/**
 * Renderiza en un portal a document.body para aislar el mapa de cualquier
 * CSS heredado (overflow, backdrop-blur, transform) que pueda dejar el canvas en negro.
 */
export function MapPickerModal({ open, onOpenChange, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !mounted || !mapContainer.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setError("Mapa no configurado. Configurá NEXT_PUBLIC_MAPBOX_TOKEN en .env")
      return
    }

    mapboxgl.accessToken = token
    setPicked(null)
    setError("")
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    const container = mapContainer.current

    const mapInstance = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: CABA_CENTER,
      zoom: CABA_ZOOM,
    })
    map.current = mapInstance

    mapInstance.on("load", () => {
      mapInstance.resize()
    })
    mapInstance.on("error", (ev: unknown) => {
      const e = ev as { error?: { message?: string } }
      const msg = e?.error?.message || "Error de Mapbox"
      setError(`Mapbox: ${msg}. Revisá el token y Allowed URLs en Mapbox Studio.`)
    })
    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right")

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      setPicked({ lat, lng })

      if (markerRef.current) markerRef.current.remove()
      const el = document.createElement("div")
      el.innerHTML = `<div style="width:32px;height:32px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="font-size:16px">📍</span></div>`
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapInstance)
    }

    mapInstance.on("click", handleClick)

    return () => {
      mapInstance.remove()
      map.current = null
    }
  }, [open, mounted])

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

  if (!open || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.85)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      aria-describedby="map-picker-desc"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-2xl flex flex-col rounded-2xl border border-white/10 bg-[#0b0b0c] shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <h2 id="map-picker-title" className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#10b981]" />
            Marcá la ubicación en el mapa
          </h2>
          <p id="map-picker-desc" className="text-sm text-white/60 mt-1">
            Hacé click en el mapa donde está el lugar. Luego confirmá para usar esa ubicación.
          </p>
        </div>

        {/* Contenedor aislado: dimensiones fijas, sin transform/overflow de padres */}
        <div
          className="flex-shrink-0 relative"
          style={{
            height: 420,
            width: "100%",
            minHeight: 420,
          }}
        >
          <div
            ref={mapContainer}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
          {picked && (
            <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 bg-black/60 px-3 py-2 rounded-lg z-10">
              📍 {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)} — Confirmá para usar
            </p>
          )}
        </div>

        {error && (
          <p className="px-6 py-2 text-sm text-red-400 bg-red-500/10">{error}</p>
        )}

        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={geocoding}
            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={geocoding || !picked}
            className="px-4 py-2 rounded-lg bg-[#10b981] text-white hover:bg-[#0d9668] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {geocoding ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Obteniendo dirección...
              </span>
            ) : (
              "Confirmar ubicación"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-white/10 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
