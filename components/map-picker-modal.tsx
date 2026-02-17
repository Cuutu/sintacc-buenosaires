"use client"

/**
 * Modal "Marcá la ubicación en el mapa"
 * - Buscar dirección con autocomplete (Mapbox Forward Geocoding)
 * - Click en mapa → pin + reverse geocode → "Dirección detectada"
 * - Si reverse falla: campos Barrio + Referencia
 * - No muestra lat/lng al usuario
 * Requiere: NEXT_PUBLIC_MAPBOX_TOKEN en .env.local
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import {
  forwardGeocode,
  reverseGeocode,
  type ForwardGeocodeResult,
} from "@/lib/mapboxGeocode"
import { CABA_CENTER, CABA_ZOOM } from "@/components/map-view/geo"
import { Loader2, MapPin, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NEIGHBORHOODS } from "@/lib/constants"

export interface MapPickerResult {
  lat: number
  lng: number
  address: string
  neighborhood: string
  addressText: string
  locationPrecision: "exact" | "approx"
  userProvidedNeighborhood?: string
  userProvidedReference?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: MapPickerResult) => void
}

const DEBOUNCE_MS = 350

export function MapPickerModal({ open, onOpenChange, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState<ForwardGeocodeResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [addressText, setAddressText] = useState("")
  const [neighborhood, setNeighborhood] = useState<string | undefined>()
  const [needsUserInput, setNeedsUserInput] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState("")
  const [isApprox, setIsApprox] = useState(false)
  const [userNeighborhood, setUserNeighborhood] = useState("")
  const [userReference, setUserReference] = useState("")
  const [mounted, setMounted] = useState(false)

  const runReverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setGeocoding(true)
      setError("")
      try {
        const result = await reverseGeocode(lat, lng, {
          signal: abortRef.current.signal,
        })
        if (result) {
          setAddressText(result.addressText)
          setNeighborhood(result.neighborhood)
          setNeedsUserInput(result.needsUserInput)
          if (result.needsUserInput) {
            setUserNeighborhood(result.neighborhood || "")
          }
        } else {
          setAddressText("")
          setNeedsUserInput(true)
          setUserNeighborhood("")
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return
        setAddressText("")
        setNeedsUserInput(true)
        setUserNeighborhood("")
      } finally {
        setGeocoding(false)
      }
    },
    []
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchSuggestions([])
      setShowSearchDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()
        const results = await forwardGeocode(searchQuery, {
          limit: 5,
          signal: abortRef.current.signal,
        })
        setSearchSuggestions(results)
        setShowSearchDropdown(true)
      } catch {
        setSearchSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
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
    setAddressText("")
    setNeighborhood(undefined)
    setNeedsUserInput(false)
    setUserNeighborhood("")
    setUserReference("")
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

    mapInstance.on("load", () => mapInstance.resize())
    mapInstance.on("error", (ev: unknown) => {
      const e = ev as { error?: { message?: string } }
      setError(`Mapbox: ${e?.error?.message || "Error"}. Revisá el token en Mapbox Studio.`)
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

      runReverseGeocode(lat, lng)
    }

    mapInstance.on("click", handleClick)

    return () => {
      mapInstance.remove()
      map.current = null
    }
  }, [open, mounted, runReverseGeocode])

  const handleSearchSelect = (item: ForwardGeocodeResult) => {
    setSearchQuery(item.place_name)
    setShowSearchDropdown(false)
    setPicked({ lat: item.lat, lng: item.lng })

    if (markerRef.current) markerRef.current.remove()
    if (map.current) {
      map.current.flyTo({ center: [item.lng, item.lat], zoom: 16 })
      const el = document.createElement("div")
      el.innerHTML = `<div style="width:32px;height:32px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="font-size:16px">📍</span></div>`
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .addTo(map.current)
    }

    setAddressText(item.address)
    setNeighborhood(item.neighborhood)
    setNeedsUserInput(false)
  }

  const handleConfirm = () => {
    if (!picked) {
      setError("Seleccioná un punto en el mapa o buscá una dirección")
      return
    }
    if (needsUserInput && !userNeighborhood.trim()) {
      setError("Si no se detectó la dirección, ingresá el barrio")
      return
    }

    const finalAddress = addressText || (needsUserInput ? userNeighborhood : "")
    const finalAddrDisplay = userReference.trim()
      ? `${finalAddress}${finalAddress ? " - " : ""}${userReference}`
      : finalAddress

    onSelect({
      lat: picked.lat,
      lng: picked.lng,
      address: finalAddrDisplay || "Ubicación seleccionada",
      neighborhood: neighborhood || userNeighborhood || "Otro",
      addressText: finalAddrDisplay || "Ubicación seleccionada (sin dirección)",
      locationPrecision: isApprox ? "approx" : "exact",
      ...(needsUserInput && {
        userProvidedNeighborhood: userNeighborhood.trim() || undefined,
        userProvidedReference: userReference.trim() || undefined,
      }),
    })
    onOpenChange(false)
  }

  const canConfirm = picked && (!needsUserInput || userNeighborhood.trim())

  if (!open || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
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
            Buscá una dirección o hacé click en el mapa. La dirección se detectará automáticamente.
          </p>
        </div>

        <div className="flex-shrink-0 px-6 pb-3">
          <div ref={searchWrapperRef} className="relative">
            <div className="relative">
              {searchLoading ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar dirección o lugar..."
                className="pl-10"
                autoComplete="off"
              />
            </div>
            {showSearchDropdown && searchSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 py-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchSuggestions.map((item) => (
                  <li
                    key={item.place_name + item.lat + item.lng}
                    className="px-3 py-2 cursor-pointer text-sm hover:bg-accent"
                    onClick={() => handleSearchSelect(item)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="line-clamp-2">{item.place_name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          className="flex-shrink-0 relative"
          style={{ height: 360, width: "100%", minHeight: 360 }}
        >
          <div
            ref={mapContainer}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        </div>

        <div className="flex-shrink-0 px-6 py-4 space-y-4 border-t border-white/10">
          {geocoding ? (
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando dirección...
            </p>
          ) : addressText ? (
            <div>
              <Label className="text-xs text-white/60">Dirección detectada</Label>
              <p className="text-sm font-medium mt-0.5">{addressText}</p>
            </div>
          ) : needsUserInput && picked ? (
            <div>
              <p className="text-sm text-amber-400/90 mb-2">
                No pudimos obtener la dirección exacta. Completá el barrio:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Barrio/Localidad *</Label>
                  <select
                    value={userNeighborhood}
                    onChange={(e) => setUserNeighborhood(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccioná...</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Referencia (opcional)</Label>
                  <Input
                    value={userReference}
                    onChange={(e) => setUserReference(e.target.value)}
                    placeholder="Ej: frente a..."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isApprox}
              onChange={(e) => setIsApprox(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Ubicación aproximada</span>
          </label>
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
            disabled={geocoding || !canConfirm}
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
