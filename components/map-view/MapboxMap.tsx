"use client"

/**
 * Nota: Mapbox GL JS envía telemetría a events.mapbox.com. Si usás bloqueador de anuncios
 * (uBlock, Brave, etc.) verás `ERR_BLOCKED_BY_CLIENT` en consola. El mapa funciona igual.
 * Mapbox no ofrece opción para desactivar esto en la versión GL JS.
 */
import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { IPlace } from "@/models/Place"
import { CABA_CENTER, CABA_ZOOM } from "./geo"
import { geocodeAddress } from "@/lib/geocode"
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
  /** Solicita permisos de ubicación y muestra al usuario en el mapa (punto azul) */
  triggerGeolocate: () => void
}

interface MapboxMapProps {
  places: IPlace[]
  selectedPlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  /** Llamado al terminar move/zoom con el nivel de zoom actual */
  onMoveEnd?: (zoom: number) => void
  searchQuery?: string
  /** Centro inicial [lng, lat]. Si no se pasa, usa CABA */
  initialCenter?: [number, number]
  /** Zoom inicial. Si no se pasa, usa CABA_ZOOM */
  initialZoom?: number
  darkStyle?: boolean
  reduceMotion?: boolean
  /** Si true, agrega GeolocateControl para mostrar ubicación del usuario (punto azul) */
  enableGeolocate?: boolean
  /** Callback cuando falla la geolocalización (ej. permiso denegado) */
  onGeolocateError?: (error: GeolocationPositionError) => void
  /** Callback cuando se obtiene la ubicación correctamente */
  onGeolocateSuccess?: () => void
}

export const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      places,
      selectedPlaceId,
      onPlaceSelect,
      onBoundsChange,
      onMoveEnd,
      searchQuery,
      initialCenter,
      initialZoom,
      darkStyle = true,
      reduceMotion = false,
      enableGeolocate = false,
      onGeolocateError,
      onGeolocateSuccess,
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])
    const sharedPopupRef = useRef<mapboxgl.Popup | null>(null)
    const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null)
    const onBoundsChangeRef = useRef(onBoundsChange)
    onBoundsChangeRef.current = onBoundsChange
    const onMoveEndRef = useRef(onMoveEnd)
    onMoveEndRef.current = onMoveEnd

    const triggerGeolocate = useCallback(() => {
      geolocateControlRef.current?.trigger()
    }, [])

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

    useImperativeHandle(ref, () => ({ flyTo, setCenter, triggerGeolocate }), [flyTo, setCenter, triggerGeolocate])

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
          center: initialCenter ?? CABA_CENTER,
          zoom: initialZoom ?? CABA_ZOOM,
        })
        sharedPopupRef.current = new mapboxgl.Popup({
          offset: 25,
          className: "celimap-popup",
          closeButton: false,
          closeOnClick: true,
        })
      }

      return () => {}
    }, [darkStyle, initialCenter, initialZoom])

    // GeolocateControl: punto azul de ubicación del usuario (solo en mobile, se activa con FAB)
    useEffect(() => {
      const m = map.current
      if (!m || !enableGeolocate) return

      if (!navigator.geolocation) return

      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        trackUserLocation: true,
        showUserLocation: true,
        showUserHeading: false,
        showAccuracyCircle: true,
        showButton: false, // Usamos nuestro FAB para activar
      })
      const onError = (e: GeolocationPositionError) => onGeolocateError?.(e)
      const onSuccess = () => onGeolocateSuccess?.()
      geolocate.on("error", onError)
      geolocate.on("trackuserlocationstart", onSuccess)
      m.addControl(geolocate, "top-right")
      geolocateControlRef.current = geolocate

      return () => {
        geolocate.off("error", onError)
        geolocate.off("trackuserlocationstart", onSuccess)
        m.removeControl(geolocate)
        geolocateControlRef.current = null
      }
    }, [enableGeolocate, onGeolocateError, onGeolocateSuccess])

    // Cuando la búsqueda cambia, volar a la localidad si Mapbox la encuentra
    useEffect(() => {
      if (!searchQuery?.trim()) return
      geocodeAddress(searchQuery.trim()).then((geo) => {
        if (geo && map.current) {
          map.current.flyTo({
            center: [geo.lng, geo.lat],
            zoom: 13,
            duration: reduceMotion ? 0 : 1000,
          })
        }
      })
    }, [searchQuery, reduceMotion])

    useEffect(() => {
      const m = map.current
      if (!m) return
      const onLoadOrMoveEnd = () => {
        const b = m.getBounds()
        if (b) onBoundsChangeRef.current?.(b)
        onMoveEndRef.current?.(m.getZoom())
      }
      m.on("load", onLoadOrMoveEnd)
      m.on("moveend", onLoadOrMoveEnd)
      return () => {
        m.off("load", onLoadOrMoveEnd)
        m.off("moveend", onLoadOrMoveEnd)
      }
    }, [onBoundsChange, onMoveEnd])

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

        el.addEventListener("click", (e) => {
          e.stopPropagation()
          onPlaceSelect?.(place)
          // Popup preview con mini info
          if (sharedPopupRef.current && map.current) {
            const safetyMap: Record<string, string> = {
              dedicated_gf: '<span style="color:#4ade80;font-size:10px;font-weight:700;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.3);padding:2px 8px;border-radius:4px">✅ 100% SIN TACC</span>',
              gf_options: '<span style="color:#fbbf24;font-size:10px;font-weight:700;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);padding:2px 8px;border-radius:4px">🟡 TIENE OPCIONES</span>',
            }
            const tags = (place.tags ?? []) as string[]
            const level = (place as any).safetyLevel
              ?? (tags.includes("100_gf") || tags.includes("certificado_sin_tacc") ? "dedicated_gf"
                : tags.includes("opciones_sin_tacc") ? "gf_options" : null)

            const safetyHtml = level ? (safetyMap[level] ?? "") : ""
            const typeIcons: Record<string, string> = {
              restaurant: "🍕", cafe: "☕", bakery: "🥐",
              store: "🛒", icecream: "🍦", bar: "🍺", other: "📍",
            }
            const icon = typeIcons[(place.types?.[0] ?? place.type) as string] ?? "📍"

            const html = `
    <div style="
      background:#13161f;border:1.5px solid #2e3448;border-radius:12px;
      padding:12px;width:200px;box-shadow:0 8px 24px rgba(0,0,0,0.5);
      font-family:system-ui,sans-serif;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:18px">${icon}</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#e8eaf2;line-height:1.2">${place.name}</div>
          <div style="font-size:11px;color:#8890aa;margin-top:1px">${place.neighborhood ?? ""}</div>
        </div>
      </div>
      ${safetyHtml ? `<div style="margin-bottom:10px">${safetyHtml}</div>` : ""}
      <a href="/lugar/${place._id}"
        style="display:block;width:100%;padding:7px;background:#4ade80;color:#000;
          border:none;border-radius:7px;font-size:12px;font-weight:700;
          text-align:center;text-decoration:none;cursor:pointer"
        onclick="event.stopPropagation()"
      >Ver detalle →</a>
    </div>
  `
            sharedPopupRef.current
              .setLngLat([
                (place.location as any).lng ?? (place.location as any).coordinates?.[0],
                (place.location as any).lat ?? (place.location as any).coordinates?.[1],
              ])
              .setHTML(html)
              .addTo(map.current)
          }
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
