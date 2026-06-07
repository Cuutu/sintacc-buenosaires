"use client"

/**
 * Nota: Mapbox GL JS envía telemetría a events.mapbox.com. Si usás bloqueador de anuncios
 * (uBlock, Brave, etc.) verás `ERR_BLOCKED_BY_CLIENT` en consola. El mapa funciona igual.
 * Mapbox no ofrece opción para desactivar esto en la versión GL JS.
 */
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { IPlace } from "@/models/Place"
import { CABA_CENTER, CABA_ZOOM } from "./geo"
import { getPlacePath } from "@/lib/place-url"
import {
  findKnownNeighborhoodSearch,
  getNeighborhoodSearchValues,
  normalizeSearchValue,
} from "@/lib/map-search"
export const TYPE_MARKERS: Record<string, { emoji: string; bg: string; label: string }> = {
  restaurant: { emoji: "🍽️", bg: "#ea580c", label: "Restaurante" },
  cafe: { emoji: "☕", bg: "#78350f", label: "Café" },
  bakery: { emoji: "🥐", bg: "#ca8a04", label: "Panadería" },
  store: { emoji: "🛒", bg: "#16a34a", label: "Tienda" },
  icecream: { emoji: "🍦", bg: "#ec4899", label: "Heladería" },
  bar: { emoji: "🍺", bg: "#7c3aed", label: "Bar" },
  other: { emoji: "📍", bg: "#3b82f6", label: "Lugar" },
}

const POPUP_ICON_PATHS: Record<string, string> = {
  restaurant: '<path d="M3 2v7c0 1.7 1.3 3 3 3s3-1.3 3-3V2"/><path d="M6 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>',
  cafe: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8h1a4 4 0 1 1 0 8h-1"/><path d="M5 8h11v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z"/>',
  bakery: '<path d="M12 20a8 8 0 0 0 8-8c0-2.6-1.3-5-3.4-6.4"/><path d="M12 20a8 8 0 0 1-8-8c0-2.6 1.3-5 3.4-6.4"/><path d="M12 20c2.2 0 4-3.6 4-8s-1.8-8-4-8-4 3.6-4 8 1.8 8 4 8Z"/><path d="M4.3 10h15.4"/>',
  store: '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/><path d="M5 11 9 4"/>',
  icecream: '<path d="M7 11a5 5 0 0 1 10 0"/><path d="M8 11h8l-4 10Z"/><path d="M12 3v2"/>',
  bar: '<path d="M8 22h8"/><path d="M12 16v6"/><path d="M7 2h10l-1 9a4 4 0 0 1-8 0Z"/><path d="M7 8h10"/>',
  other: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getPopupIcon(type: string): string {
  const path = POPUP_ICON_PATHS[type] ?? POPUP_ICON_PATHS.other
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;display:block">${path}</svg>`
}

function getPopupSafety(level?: string | null) {
  if (level === "dedicated_gf") {
    return {
      label: "100% sin TACC",
      description: "Local dedicado",
      accent: "#10d98a",
      badgeBg: "rgba(16,217,138,0.13)",
      badgeBorder: "rgba(16,217,138,0.34)",
      badgeText: "#91f5c4",
    }
  }

  if (level === "gf_options") {
    return {
      label: "Opciones sin TACC",
      description: "Consultá al pedir",
      accent: "#f6b33d",
      badgeBg: "rgba(246,179,61,0.14)",
      badgeBorder: "rgba(246,179,61,0.34)",
      badgeText: "#ffd891",
    }
  }

  return null
}

function getPopupRating(place: IPlace & { stats?: { avgRating?: number; totalReviews?: number } }): string | null {
  const totalReviews = place.stats?.totalReviews ?? 0
  const avgRating = place.stats?.avgRating ?? 0

  if (totalReviews > 0) {
    return `${avgRating.toFixed(1)} · ${totalReviews} reseña${totalReviews === 1 ? "" : "s"}`
  }

  return null
}

export interface MapboxMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  setCenter: (lng: number, lat: number) => void
  /** Solicita permisos de ubicación y muestra al usuario en el mapa (punto azul) */
  triggerGeolocate: () => void
  showUserLocation: (lng: number, lat: number) => void
}

export interface MapViewportBounds {
  west: number
  south: number
  east: number
  north: number
}

interface MarkerEntry {
  marker: mapboxgl.Marker
  element: HTMLDivElement
  inner: HTMLDivElement
  icon: HTMLSpanElement
  item: MapMarkerItem
}

type MapMarkerItem =
  | {
      id: string
      kind: "place"
      place: IPlace
      lng: number
      lat: number
    }
  | {
      id: string
      kind: "cluster"
      places: IPlace[]
      lng: number
      lat: number
    }

interface MapboxMapProps {
  places: IPlace[]
  selectedPlaceId?: string
  onPlaceSelect?: (place: IPlace) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  /** Llamado al terminar move/zoom con el nivel de zoom actual y bounds visibles */
  onMoveEnd?: (zoom: number, bounds: MapViewportBounds) => void
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
  clusterMarkers?: boolean
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
      clusterMarkers = false,
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map())
    const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null)
    const sharedPopupRef = useRef<mapboxgl.Popup | null>(null)
    const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null)
    const lastCenteredSearchRef = useRef<string | null>(null)
    const lastFocusedPlaceIdRef = useRef<string | null>(null)
    const selectedPlaceIdRef = useRef(selectedPlaceId)
    selectedPlaceIdRef.current = selectedPlaceId
    const onPlaceSelectRef = useRef(onPlaceSelect)
    onPlaceSelectRef.current = onPlaceSelect
    const onBoundsChangeRef = useRef(onBoundsChange)
    onBoundsChangeRef.current = onBoundsChange
    const onMoveEndRef = useRef(onMoveEnd)
    onMoveEndRef.current = onMoveEnd
    const [markerLayoutVersion, setMarkerLayoutVersion] = useState(0)

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

    const showUserLocation = useCallback((lng: number, lat: number) => {
      if (!map.current) return

      if (!userLocationMarkerRef.current) {
        const el = document.createElement("div")
        el.setAttribute("aria-label", "Tu ubicación")
        el.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: rgba(0, 194, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 0 0 4px rgba(0, 194, 255, 0.14), 0 8px 18px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        `

        const dot = document.createElement("div")
        dot.style.cssText = `
          width: 11px;
          height: 11px;
          border-radius: 9999px;
          background: #00c2ff;
          border: 2px solid white;
        `

        el.appendChild(dot)
        userLocationMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map.current)
        return
      }

      userLocationMarkerRef.current.setLngLat([lng, lat])
    }, [])

    const applyMarkerSelection = useCallback((entry: MarkerEntry, isSelected: boolean) => {
      entry.element.style.width = `${isSelected ? 44 : 36}px`
      entry.element.style.height = `${isSelected ? 44 : 36}px`
      entry.inner.style.border = `${isSelected ? "3px" : "2px"} solid white`
      entry.icon.style.fontSize = `${isSelected ? 20 : 16}px`
    }, [])

    const markerItems = useMemo<MapMarkerItem[]>(() => {
      void markerLayoutVersion
      const m = map.current
      const validPlaces = places
        .map((place) => ({
          place,
          lng: place.location?.lng,
          lat: place.location?.lat,
          id: place._id.toString(),
        }))
        .filter((item): item is { place: IPlace; lng: number; lat: number; id: string } =>
          Number.isFinite(item.lng) && Number.isFinite(item.lat)
        )

      if (!clusterMarkers || !m || m.getZoom() >= 15) {
        return validPlaces.map(({ place, lng, lat, id }) => ({
          id,
          kind: "place",
          place,
          lng,
          lat,
        }))
      }

      const zoom = m.getZoom()
      const radius = zoom < 11 ? 58 : zoom < 13 ? 48 : 38
      const clusters: Array<{
        places: IPlace[]
        x: number
        y: number
        lng: number
        lat: number
      }> = []

      validPlaces.forEach(({ place, lng, lat }) => {
        const point = m.project([lng, lat])
        const cluster = clusters.find((candidate) => {
          const dx = candidate.x - point.x
          const dy = candidate.y - point.y
          return Math.sqrt(dx * dx + dy * dy) <= radius
        })

        if (!cluster) {
          clusters.push({ places: [place], x: point.x, y: point.y, lng, lat })
          return
        }

        const nextCount = cluster.places.length + 1
        cluster.x = (cluster.x * cluster.places.length + point.x) / nextCount
        cluster.y = (cluster.y * cluster.places.length + point.y) / nextCount
        cluster.lng = (cluster.lng * cluster.places.length + lng) / nextCount
        cluster.lat = (cluster.lat * cluster.places.length + lat) / nextCount
        cluster.places.push(place)
      })

      return clusters.map((cluster) => {
        if (cluster.places.length === 1) {
          const place = cluster.places[0]
          return {
            id: place._id.toString(),
            kind: "place",
            place,
            lng: cluster.lng,
            lat: cluster.lat,
          }
        }

        const ids = cluster.places.map((place) => place._id.toString()).sort()
        return {
          id: `cluster:${ids.join(":")}`,
          kind: "cluster",
          places: cluster.places,
          lng: cluster.lng,
          lat: cluster.lat,
        }
      })
    }, [clusterMarkers, markerLayoutVersion, places])

    useImperativeHandle(
      ref,
      () => ({ flyTo, setCenter, triggerGeolocate, showUserLocation }),
      [flyTo, setCenter, triggerGeolocate, showUserLocation]
    )

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
          maxWidth: "none",
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

    // Cuando la busqueda cambia, encuadrar los lugares encontrados una sola vez.
    useEffect(() => {
      const normalizedSearch = normalizeSearchValue(searchQuery ?? "")
      if (!normalizedSearch || !places.length || !map.current) {
        if (!normalizedSearch) lastCenteredSearchRef.current = null
        return
      }
      if (lastCenteredSearchRef.current === normalizedSearch) return

      const firstPlace = places[0]
      if (!firstPlace?.location) return

      const searchableText = [
        firstPlace.name,
        firstPlace.address,
        firstPlace.addressText,
        firstPlace.neighborhood,
        (firstPlace as any).userProvidedNeighborhood,
        (firstPlace as any).userProvidedReference,
      ]
        .filter(Boolean)
        .join(" ")
      const normalizedSearchableText = normalizeSearchValue(searchableText)
      const searchNeighborhood = findKnownNeighborhoodSearch(searchQuery ?? "")
      const neighborhoodSearchValues = searchNeighborhood
        ? getNeighborhoodSearchValues(searchNeighborhood).map(normalizeSearchValue)
        : []
      const matchesSearch = neighborhoodSearchValues.length > 0
        ? neighborhoodSearchValues.some((value) => normalizedSearchableText.includes(value))
        : normalizedSearch.split(/\s+/).every((word) => normalizedSearchableText.includes(word))
      if (!matchesSearch) return

      lastCenteredSearchRef.current = normalizedSearch
      const validPlaces = places.filter(
        (place) =>
          Number.isFinite(place.location?.lng) &&
          Number.isFinite(place.location?.lat)
      )
      if (validPlaces.length > 1) {
        const bounds = new mapboxgl.LngLatBounds()
        validPlaces.forEach((place) => {
          bounds.extend([place.location.lng, place.location.lat])
        })
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 14,
          duration: reduceMotion ? 0 : 1000,
        })
        return
      }

      map.current.flyTo({
        center: [firstPlace.location.lng, firstPlace.location.lat],
        zoom: 15,
        duration: reduceMotion ? 0 : 1000,
      })
    }, [searchQuery, places, reduceMotion])

    useEffect(() => {
      const m = map.current
      if (!m) return
      const onLoadOrMoveEnd = () => {
        setMarkerLayoutVersion((version) => version + 1)
        const b = m.getBounds()
        if (!b) return
        onBoundsChangeRef.current?.(b)
        onMoveEndRef.current?.(m.getZoom(), {
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        })
      }
      m.on("load", onLoadOrMoveEnd)
      m.on("moveend", onLoadOrMoveEnd)
      return () => {
        m.off("load", onLoadOrMoveEnd)
        m.off("moveend", onLoadOrMoveEnd)
      }
    }, [])

    useEffect(() => {
      const m = map.current
      if (!m) return

      const nextMarkerIds = new Set<string>()

      markerItems.forEach((item) => {
        nextMarkerIds.add(item.id)
        const isCluster = item.kind === "cluster"
        const config = isCluster
          ? TYPE_MARKERS.other
          : TYPE_MARKERS[item.place.type] || TYPE_MARKERS.other
        const existingEntry = markerEntriesRef.current.get(item.id)

        if (existingEntry) {
          existingEntry.item = item
          existingEntry.marker.setLngLat([item.lng, item.lat])
          if (isCluster) {
            existingEntry.inner.style.background = "linear-gradient(135deg, #06120f, #0f2f27)"
            existingEntry.inner.style.border = "2px solid rgba(16,185,129,0.85)"
            existingEntry.inner.style.boxShadow = "0 10px 28px rgba(0,0,0,0.36), 0 0 0 5px rgba(16,185,129,0.16)"
            existingEntry.icon.textContent = String(item.places.length)
            existingEntry.icon.style.fontSize = item.places.length > 99 ? "14px" : "15px"
          } else {
            existingEntry.inner.style.background = config.bg
            existingEntry.icon.textContent = config.emoji
            applyMarkerSelection(existingEntry, selectedPlaceIdRef.current === item.id)
          }
          return
        }

        const el = document.createElement("div")
        el.className = "mapboxgl-marker"
        el.style.cssText = `
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
          background: ${isCluster ? "linear-gradient(135deg, #06120f, #0f2f27)" : config.bg};
          box-shadow: ${isCluster ? "0 10px 28px rgba(0,0,0,0.36), 0 0 0 5px rgba(16,185,129,0.16)" : "0 2px 8px rgba(0,0,0,0.25)"};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          transform-origin: center center;
          color: white;
          font-weight: 800;
        `

        const icon = document.createElement("span")
        icon.style.lineHeight = "1"
        icon.textContent = isCluster ? String(item.places.length) : config.emoji

        inner.appendChild(icon)
        el.appendChild(inner)

        el.addEventListener("click", (e) => {
          e.stopPropagation()
          const currentItem = markerEntriesRef.current.get(item.id)?.item ?? item

          if (currentItem.kind === "cluster") {
            const bounds = new mapboxgl.LngLatBounds()
            currentItem.places.forEach((place) => {
              if (Number.isFinite(place.location?.lng) && Number.isFinite(place.location?.lat)) {
                bounds.extend([place.location.lng, place.location.lat])
              }
            })
            m.fitBounds(bounds, {
              padding: 96,
              maxZoom: Math.max(14, m.getZoom() + 2),
              duration: reduceMotion ? 0 : 700,
            })
            return
          }

          const currentPlace = currentItem.place
          onPlaceSelectRef.current?.(currentPlace)

          if (sharedPopupRef.current && map.current) {
            const tags = (currentPlace.tags ?? []) as string[]
            const level = (currentPlace as any).safetyLevel
              ?? (tags.includes("100_gf") || tags.includes("certificado_sin_tacc") ? "dedicated_gf"
                : tags.includes("opciones_sin_tacc") ? "gf_options" : null)

            const popupType = (currentPlace.types?.[0] ?? currentPlace.type) as string
            const markerConfig = TYPE_MARKERS[popupType] ?? TYPE_MARKERS.other
            const safety = getPopupSafety(level)
            const accent = safety?.accent ?? markerConfig.bg
            const typeLabel = escapeHtml(markerConfig.label)
            const name = escapeHtml(currentPlace.name)
            const neighborhood = escapeHtml(currentPlace.neighborhood)
            const locationLabel = escapeHtml([currentPlace.neighborhood, "CABA"].filter(Boolean).join(", "))
            const addressLabel = escapeHtml(currentPlace.addressText || currentPlace.address || currentPlace.neighborhood)
            const ratingLabel = getPopupRating(currentPlace)
            const lng = (currentPlace.location as any).lng ?? (currentPlace.location as any).coordinates?.[0]
            const lat = (currentPlace.location as any).lat ?? (currentPlace.location as any).coordinates?.[1]
            const directionsUrl = escapeHtml(
              Number.isFinite(lng) && Number.isFinite(lat)
                ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentPlace.name)}`
            )
            const photoUrl = currentPlace.photos?.[0] ? escapeHtml(currentPlace.photos[0]) : ""
            const detailPath = escapeHtml(getPlacePath(currentPlace))
            const photoHtml = photoUrl
              ? `<img src="${photoUrl}" alt="" loading="lazy" style="width:76px;height:76px;display:block;object-fit:cover;border-radius:15px;background:#10151b;box-shadow:0 12px 22px rgba(0,0,0,.32)">`
              : `<div style="width:76px;height:76px;border-radius:15px;background:radial-gradient(circle at 35% 25%,${accent}42,rgba(255,255,255,.08) 58%,rgba(255,255,255,.04));display:flex;align-items:center;justify-content:center;color:${accent};border:1px solid rgba(255,255,255,.10);box-shadow:0 12px 22px rgba(0,0,0,.24)">${getPopupIcon(popupType)}</div>`
            const safetyHtml = safety
              ? `<span style="display:inline-flex;align-items:center;gap:6px;max-width:100%;border-radius:999px;border:1px solid ${safety.badgeBorder};background:${safety.badgeBg};color:${safety.badgeText};padding:5px 9px;font-size:11.5px;font-weight:760;line-height:1;white-space:nowrap">
                  <span style="width:7px;height:7px;border-radius:999px;background:${safety.accent};box-shadow:0 0 12px ${safety.accent}99;flex:0 0 auto"></span>
                  ${safety.label}
                </span>`
              : ""
            const ratingHtml = ratingLabel
              ? `<span style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#dce3ee;padding:5px 9px;font-size:11.5px;font-weight:720;white-space:nowrap">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;display:block"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z"/></svg>
                  ${escapeHtml(ratingLabel)}
                </span>`
              : ""
            const html = `
    <div style="width:min(315px,calc(100vw - 36px));overflow:hidden;border-radius:19px;background:linear-gradient(145deg,rgba(17,22,29,.97),rgba(7,11,15,.96));color:#f8fafc;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.05) inset;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="position:relative;padding:11px">
        <div style="position:absolute;right:-66px;top:-78px;width:142px;height:142px;border-radius:999px;background:radial-gradient(circle,${accent}28,rgba(255,255,255,0) 66%);pointer-events:none"></div>
        <div style="position:relative;display:grid;grid-template-columns:76px 1fr;gap:11px;align-items:start">
          <div style="position:relative">
            ${photoHtml}
          </div>
          <div style="min-width:0;padding-top:2px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
              <div title="${name}" style="min-width:0;color:#fff;font-size:18px;font-weight:860;line-height:1.08;letter-spacing:0;text-shadow:0 1px 2px rgba(0,0,0,.25);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${name}</div>
              <div aria-hidden="true" style="width:28px;height:28px;flex:0 0 auto;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#d7dde8">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:6px;color:#aeb7c5;font-size:12.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;display:block;flex:0 0 auto"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="overflow:hidden;text-overflow:ellipsis">${locationLabel || addressLabel}</span>
            </div>
          </div>
        </div>

        <div style="position:relative;margin-top:9px;color:#b7bfcc;font-size:11.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${addressLabel || `${typeLabel}${neighborhood ? ` en ${neighborhood}` : ""}`}
        </div>

        <div style="position:relative;margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:6px">
          ${safetyHtml}
          <span style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#dce3ee;padding:5px 9px;font-size:11.5px;font-weight:720;white-space:nowrap">
            ${getPopupIcon(popupType)}
            ${typeLabel}
          </span>
          ${ratingHtml}
        </div>

        <div style="position:relative;margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <a href="${detailPath}" style="display:flex;align-items:center;justify-content:center;gap:7px;min-height:38px;border-radius:12px;background:linear-gradient(135deg,#25d976,#50ee92);color:#06130d;text-decoration:none;font-size:12.5px;font-weight:860;box-shadow:0 10px 20px rgba(16,217,138,.18)" onclick="event.stopPropagation()">
            Ver lugar
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;display:block"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
          </a>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:7px;min-height:38px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid ${accent};color:${accent};text-decoration:none;font-size:12.5px;font-weight:800" onclick="event.stopPropagation()">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;display:block"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Cómo llegar
          </a>
        </div>
      </div>
    </div>
  `
            sharedPopupRef.current
              .setLngLat([
                lng,
                lat,
              ])
              .setHTML(html)
              .addTo(map.current)
          }
        })

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.lng, item.lat])
          .addTo(m)

        const entry: MarkerEntry = { marker, element: el, inner, icon, item }
        markerEntriesRef.current.set(item.id, entry)
        if (isCluster) {
          el.style.width = "42px"
          el.style.height = "42px"
          inner.style.border = "2px solid rgba(16,185,129,0.85)"
          icon.style.fontSize = item.places.length > 99 ? "14px" : "15px"
        } else {
          applyMarkerSelection(entry, selectedPlaceIdRef.current === item.id)
        }
      })

      markerEntriesRef.current.forEach((entry, markerId) => {
        if (nextMarkerIds.has(markerId)) return
        entry.marker.remove()
        markerEntriesRef.current.delete(markerId)
      })
    }, [applyMarkerSelection, markerItems, reduceMotion])

    useEffect(() => {
      markerEntriesRef.current.forEach((entry, placeId) => {
        if (entry.item.kind !== "place") return
        applyMarkerSelection(entry, placeId === selectedPlaceId)
      })
    }, [selectedPlaceId, applyMarkerSelection])

    useEffect(() => {
      const markerEntries = markerEntriesRef.current
      return () => {
        markerEntries.forEach((entry) => entry.marker.remove())
        markerEntries.clear()
        userLocationMarkerRef.current?.remove()
        userLocationMarkerRef.current = null
      }
    }, [])

    useEffect(() => {
      if (!map.current || !selectedPlaceId) {
        lastFocusedPlaceIdRef.current = null
        return
      }
      if (lastFocusedPlaceIdRef.current === selectedPlaceId) return

      const place = places.find((p) => p._id.toString() === selectedPlaceId)
      if (place) {
        lastFocusedPlaceIdRef.current = selectedPlaceId
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
