"use client"

import { useEffect, useRef, useState } from "react"
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
 * Usa overlay propio en lugar de Radix Dialog porque Mapbox GL
 * no renderiza bien dentro de contenedores con CSS transform
 * (el Dialog usa translate para centrarse).
 */
export function MapPickerModal({ open, onOpenChange, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")

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
    setDebugInfo("")
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    const container = mapContainer.current
    let cleanup: (() => void) | null = null

    function initMap() {
      if (!container || !open) return
      try {
        const mapInstance = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/streets-v12",
          center: CABA_CENTER,
          zoom: CABA_ZOOM,
        })
        map.current = mapInstance

        mapInstance.on("load", () => {
          mapInstance.resize()
          setDebugInfo("Mapa cargado correctamente")
        })
        mapInstance.on("error", (ev: any) => {
          const message =
            ev?.error?.message ||
            ev?.error?.statusText ||
            "Error desconocido de Mapbox"
          console.error("Mapbox error in picker:", ev?.error || ev)
          setError(
            `Mapbox no pudo cargar el mapa. ${message}. Si estás en Vercel, revisá NEXT_PUBLIC_MAPBOX_TOKEN y Allowed URLs del token.`
          )
        })
        mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right")
      } catch (err: any) {
        console.error("Error creating map picker:", err)
        setError(
          `No se pudo inicializar el mapa. ${err?.message || "Error desconocido"}`
        )
        return
      }

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
    }

    const timer = setTimeout(() => {
      if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
        setDebugInfo(`Contenedor ${container.offsetWidth}x${container.offsetHeight}`)
        initMap()
      } else {
        const retry = setTimeout(() => {
          if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            setError(
              "El contenedor del mapa quedó en 0x0. Esto suele ser un problema de layout/render en producción."
            )
            return
          }
          setDebugInfo(`Retry contenedor ${container.offsetWidth}x${container.offsetHeight}`)
          initMap()
        }, 200)
        cleanup = () => clearTimeout(retry)
      }
    }, 50)

    return () => {
      clearTimeout(timer)
      cleanup?.()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      aria-describedby="map-picker-desc"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <h2 id="map-picker-title" className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Marcá la ubicación en el mapa
          </h2>
          <p id="map-picker-desc" className="text-sm text-muted-foreground mt-1">
            Hacé click en el mapa donde está el lugar. Luego confirmá para usar esa ubicación.
          </p>
        </div>

        {/* Contenedor del mapa SIN transform - clave para Mapbox */}
        <div className="flex-1 min-h-[400px] relative">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
          {picked && (
            <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 bg-black/60 px-3 py-2 rounded-lg z-10">
              📍 {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)} — Hacé click en &quot;Confirmar&quot; para usar
            </p>
          )}
        </div>

        {error && (
          <p className="px-6 py-2 text-sm text-destructive bg-destructive/10">{error}</p>
        )}
        {!error && debugInfo && (
          <p className="px-6 py-2 text-xs text-muted-foreground bg-muted/20">{debugInfo}</p>
        )}

        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={geocoding}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={geocoding || !picked}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
          className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
