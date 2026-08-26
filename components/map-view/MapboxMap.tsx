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
import { CABA_CENTER, CABA_ZOOM, type MapViewportBounds } from "./geo"
import {
  findKnownNeighborhoodSearch,
  getNeighborhoodSearchValues,
  normalizeSearchValue,
} from "@/lib/map-search"
import {
  getSafetyBadge,
  inferSafetyLevel,
} from "@/components/featured/featured-utils"
import {
  mapboxLifecycleTrackDestroy,
  mapboxLifecycleTrackInit,
} from "@/lib/mapbox-lifecycle"
import {
  createE2eMockMapboxMap,
  isE2eMapboxForceInitError,
  isE2eMapboxMockEnabled,
} from "@/lib/e2e-mapbox-adapter"
import { createMapInstanceTeardown, type MapboxTeardownMap } from "@/lib/mapbox-teardown"
import { reportClientError } from "@/lib/client-error-reporter"
import { MAP_MOVE_DEBOUNCE_MS } from "@/lib/map-places-cache"
import { celimapPinMarkup } from "@/lib/celimap-pin"
import { buildPlacePopupHtml } from "./map-popup-html"
import {
  ensurePlacesLayers,
  expandClusterAt,
  LAYER_CLUSTERS,
  LAYER_PIN_FALLBACK,
  LAYER_PINS,
  LAYER_SELECTED_PIN,
  loadCeliMapPinImages,
  PIN_FOCUS_ZOOM,
  PIN_POPUP_OFFSET,
  PLACES_SOURCE,
  queryPlaceOrClusterAt,
  setPlacesSourceData,
  setSelectedPlaceOnMap,
} from "./map-webgl-layers"
import { isNativeApp } from "@/lib/native-app"

export { TYPE_MARKERS } from "./map-popup-html"
export type { MapViewportBounds }

function softenLightMap(map: mapboxgl.Map) {
  const style = map.getStyle()
  for (const layer of style.layers ?? []) {
    const id = layer.id
    try {
      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", "#F6F1E8")
      }
      if (layer.type === "fill") {
        if (/park|landuse|landcover|national-park/i.test(id)) {
          map.setPaintProperty(id, "fill-color", "#E8EDE4")
          map.setPaintProperty(id, "fill-opacity", 0.35)
        }
        if (/water/i.test(id)) {
          map.setPaintProperty(id, "fill-color", "#E4E8E6")
        }
        if (/building/i.test(id)) {
          map.setPaintProperty(id, "fill-color", "#EDE8E0")
          map.setPaintProperty(id, "fill-opacity", 0.22)
        }
      }
      if (layer.type === "line" && /road|street|path|bridge|tunnel|pedestrian/i.test(id)) {
        map.setPaintProperty(id, "line-color", "#DDD6CC")
        map.setPaintProperty(id, "line-opacity", 0.38)
      }
      if (layer.type === "symbol") {
        if (/poi|transit|airport|rail/i.test(id)) {
          map.setLayoutProperty(id, "visibility", "none")
          continue
        }
        map.setPaintProperty(id, "text-color", "#C4BEB4")
        map.setPaintProperty(id, "text-halo-color", "#F6F1E8")
        map.setPaintProperty(id, "text-halo-width", 1)
        map.setPaintProperty(id, "icon-opacity", 0.2)
      }
    } catch {
      /* paint mismatch on this layer */
    }
  }
}

export interface MapboxMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  setCenter: (lng: number, lat: number) => void
  /** Solicita permisos de ubicación y muestra al usuario en el mapa (punto azul) */
  triggerGeolocate: () => void
  showUserLocation: (lng: number, lat: number) => void
  /** Encadra todos los lugares visibles (guía privada / reset viewport). */
  fitAllPlaces: (opts?: { maxZoom?: number; padding?: number }) => void
  projectLngLat: (lng: number, lat: number) => { x: number; y: number } | null
  getContainerSize: () => { width: number; height: number } | null
  subscribeViewChange: (listener: () => void) => () => void
}

export type MapInteractionMode = "default" | "private-guide"

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
  hoveredPlaceId?: string | null
  onPlaceSelect?: (place: IPlace) => void
  onBackgroundClick?: () => void
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
  /** Oliva = 100% sin TACC; terracota = opciones; gris = sin info */
  colorBySafety?: boolean
  /** Si false, no muestra popup Mapbox (mobile usa card inferior) */
  showPopup?: boolean
  /**
   * Modo de interacción. `private-guide`: sin popup público, marcadores numerados,
   * solo notifica selección vía onPlaceSelect. No leer URL — pasar por props.
   */
  interactionMode?: MapInteractionMode
  /** Marcadores con número de orden (1..n según orden de `places`). */
  numberedMarkers?: boolean
}

export const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      places,
      selectedPlaceId,
      hoveredPlaceId = null,
      onPlaceSelect,
      onBackgroundClick,
      onBoundsChange,
      onMoveEnd,
      searchQuery,
      initialCenter,
      initialZoom,
      darkStyle = false,
      reduceMotion = false,
      enableGeolocate = false,
      onGeolocateError,
      onGeolocateSuccess,
      clusterMarkers = false,
      colorBySafety = false,
      showPopup = true,
      interactionMode = "default",
      numberedMarkers = false,
    },
    ref
  ) => {
    const isPrivateGuide = interactionMode === "private-guide"
    const useNumberedMarkers = numberedMarkers || isPrivateGuide
    const effectiveShowPopup = isPrivateGuide ? false : showPopup
    void clusterMarkers
    void colorBySafety
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const disposedRef = useRef(false)
    const mapTeardownRef = useRef(createMapInstanceTeardown())
    const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map())
    const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null)
    const sharedPopupRef = useRef<mapboxgl.Popup | null>(null)
    const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null)
    const lastCenteredSearchRef = useRef<string | null>(null)
    const lastFocusedPlaceIdRef = useRef<string | null>(null)
    const selectedPlaceIdRef = useRef(selectedPlaceId)
    selectedPlaceIdRef.current = selectedPlaceId
    const hoveredPlaceIdRef = useRef(hoveredPlaceId)
    hoveredPlaceIdRef.current = hoveredPlaceId
    const onPlaceSelectRef = useRef(onPlaceSelect)
    onPlaceSelectRef.current = onPlaceSelect
    const onBackgroundClickRef = useRef(onBackgroundClick)
    onBackgroundClickRef.current = onBackgroundClick
    const viewListenersRef = useRef(new Set<() => void>())
    const showPopupRef = useRef(effectiveShowPopup)
    showPopupRef.current = effectiveShowPopup
    const useNumberedMarkersRef = useRef(useNumberedMarkers)
    useNumberedMarkersRef.current = useNumberedMarkers
    const isPrivateGuideRef = useRef(isPrivateGuide)
    isPrivateGuideRef.current = isPrivateGuide
    const placesRef = useRef(places)
    placesRef.current = places
    const onBoundsChangeRef = useRef(onBoundsChange)
    onBoundsChangeRef.current = onBoundsChange
    const onMoveEndRef = useRef(onMoveEnd)
    onMoveEndRef.current = onMoveEnd
    const [markerLayoutVersion, setMarkerLayoutVersion] = useState(0)
    const [initError, setInitError] = useState<string | null>(null)

    const placeNumberById = useMemo(() => {
      const mapNums = new Map<string, number>()
      places.forEach((place, index) => {
        const id = place._id != null ? String(place._id) : ""
        if (id) mapNums.set(id, index + 1)
      })
      return mapNums
    }, [places])
    const placeNumberByIdRef = useRef(placeNumberById)
    placeNumberByIdRef.current = placeNumberById

    const triggerGeolocate = useCallback(() => {
      geolocateControlRef.current?.trigger()
    }, [])

    const flyTo = useCallback(
      (lng: number, lat: number, zoom = PIN_FOCUS_ZOOM) => {
        if (disposedRef.current || !map.current) return
        try {
          map.current.flyTo({
            center: [lng, lat],
            zoom,
            duration: reduceMotion ? 0 : 1000,
          })
        } catch {
          /* mapa ya destruido */
        }
      },
      [reduceMotion]
    )

    const setCenter = useCallback((lng: number, lat: number) => {
      if (!map.current) return
      map.current.setCenter([lng, lat])
    }, [])

    const fitAllPlaces = useCallback(
      (opts?: { maxZoom?: number; padding?: number }) => {
        if (disposedRef.current || !map.current) return
        const valid = placesRef.current.filter(
          (place) =>
            Number.isFinite(place.location?.lng) &&
            Number.isFinite(place.location?.lat)
        )
        if (valid.length === 0) return
        try {
          if (valid.length === 1) {
            map.current.flyTo({
              center: [valid[0].location.lng, valid[0].location.lat],
              zoom: Math.min(opts?.maxZoom ?? 13, 14),
              duration: reduceMotion ? 0 : 700,
            })
            return
          }
          const bounds = new mapboxgl.LngLatBounds()
          valid.forEach((place) => {
            bounds.extend([place.location.lng, place.location.lat])
          })
          map.current.fitBounds(bounds, {
            padding: opts?.padding ?? 64,
            maxZoom: opts?.maxZoom ?? 13,
            duration: reduceMotion ? 0 : 700,
          })
        } catch {
          /* mapa ya destruido */
        }
      },
      [reduceMotion]
    )
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

    const projectLngLat = useCallback((lng: number, lat: number) => {
      if (!map.current) return null
      try {
        const point = map.current.project([lng, lat])
        return { x: point.x, y: point.y }
      } catch {
        return null
      }
    }, [])

    const getContainerSize = useCallback(() => {
      const el = map.current?.getContainer()
      if (!el) return null
      return { width: el.clientWidth, height: el.clientHeight }
    }, [])

    const subscribeViewChange = useCallback((listener: () => void) => {
      viewListenersRef.current.add(listener)
      return () => {
        viewListenersRef.current.delete(listener)
      }
    }, [])

    const applyMarkerSelection = useCallback(
      (entry: MarkerEntry, isSelected: boolean, isHovered = false) => {
        if (entry.item.kind === "cluster") return
        const size = 40
        const motionOk = !reduceMotion
        entry.element.style.width = `${size}px`
        entry.element.style.height = `${Math.round(size * 1.3)}px`
        entry.element.style.zIndex = isSelected ? "6" : isHovered ? "4" : "1"
        entry.inner.style.transition = motionOk
          ? "transform 0.2s ease"
          : "none"
        entry.inner.style.transform = isSelected
          ? "scale(1.15)"
          : isHovered
            ? "scale(1.08)"
            : "scale(1)"
      },
      [reduceMotion]
    )

    const markerItems = useMemo<MapMarkerItem[]>(() => {
      void markerLayoutVersion
      if (!useNumberedMarkers) return []
      return places
        .map((place) => ({
          place,
          lng: place.location?.lng,
          lat: place.location?.lat,
          id: place._id != null ? String(place._id) : "",
        }))
        .filter(
          (item): item is { place: IPlace; lng: number; lat: number; id: string } =>
            Boolean(item.id) && Number.isFinite(item.lng) && Number.isFinite(item.lat)
        )
        .map(({ place, lng, lat, id }) => ({
          id,
          kind: "place" as const,
          place,
          lng,
          lat,
        }))
    }, [markerLayoutVersion, places, useNumberedMarkers])

    useImperativeHandle(
      ref,
      () => ({
        flyTo,
        setCenter,
        triggerGeolocate,
        showUserLocation,
        fitAllPlaces,
        projectLngLat,
        getContainerSize,
        subscribeViewChange,
      }),
      [
        flyTo,
        setCenter,
        triggerGeolocate,
        showUserLocation,
        fitAllPlaces,
        projectLngLat,
        getContainerSize,
        subscribeViewChange,
      ]
    )

    useEffect(() => {
      if (!mapContainer.current) return

      // Reset por remount (Strict Mode / Desktop→Mobile)
      disposedRef.current = false
      const teardown = createMapInstanceTeardown()
      mapTeardownRef.current = teardown
      let trackedInit = false

      const safeSetInitError = (msg: string | null) => {
        if (disposedRef.current) return
        setInitError(msg)
      }

      safeSetInitError(null)

      if (map.current) return

      const destroyMap = (instance: mapboxgl.Map | null) => {
        disposedRef.current = true
        try {
          sharedPopupRef.current?.remove()
        } catch {
          /* ignore */
        }
        sharedPopupRef.current = null
        const markers = markerEntriesRef.current
        try {
          markers.forEach((entry) => entry.marker.remove())
          markers.clear()
        } catch {
          /* ignore */
        }
        try {
          userLocationMarkerRef.current?.remove()
        } catch {
          /* ignore */
        }
        userLocationMarkerRef.current = null
        geolocateControlRef.current = null

        // Ownership: anular map ref antes; teardown.destroy → map.remove() una sola vez.
        // No removeControl manual acá — Mapbox lo hace dentro de map.remove().
        if (map.current === instance) map.current = null
        teardown.destroy({
          onError: (error) => {
            reportClientError({ source: "map-cleanup", error })
          },
        })

        if (trackedInit) {
          mapboxLifecycleTrackDestroy()
          trackedInit = false
        }
      }

      try {
        if (isE2eMapboxForceInitError()) {
          throw new Error("Failed to initialize WebGL")
        }

        let instance: mapboxgl.Map
        if (isE2eMapboxMockEnabled()) {
          // Adapter E2E explícito — no WebGL real / no tiles Mapbox
          instance = createE2eMockMapboxMap(mapContainer.current)
        } else {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          if (!token) {
            console.error("MAPBOX_TOKEN no configurado")
            safeSetInitError("Mapa no configurado")
            return
          }
          mapboxgl.accessToken = token
          instance = new mapboxgl.Map({
            container: mapContainer.current,
            style: darkStyle
              ? "mapbox://styles/mapbox/dark-v11"
              : "mapbox://styles/mapbox/light-v11",
            center: initialCenter ?? CABA_CENTER,
            zoom: initialZoom ?? CABA_ZOOM,
            failIfMajorPerformanceCaveat: false,
          })
          if (!darkStyle) {
            instance.on("load", () => {
              if (!disposedRef.current) softenLightMap(instance)
            })
          }
          instance.on("load", () => {
            if (disposedRef.current || isPrivateGuide) return
            ensurePlacesLayers(instance, reduceMotion, false)
            setPlacesSourceData(instance, placesRef.current)
            void loadCeliMapPinImages(instance).then((pinsReady) => {
              if (disposedRef.current || map.current !== instance) return
              ensurePlacesLayers(instance, reduceMotion, pinsReady)
              setPlacesSourceData(instance, placesRef.current)
            })
          })
        }
        if (disposedRef.current) {
          try {
            instance.remove()
          } catch {
            /* ignore */
          }
          return
        }
        map.current = instance
        teardown.bind(instance as unknown as MapboxTeardownMap)
        mapboxLifecycleTrackInit()
        trackedInit = true
        if (!isE2eMapboxMockEnabled() && !isPrivateGuide) {
          sharedPopupRef.current = new mapboxgl.Popup({
            offset: PIN_POPUP_OFFSET,
            className: "celimap-popup",
            closeButton: false,
            closeOnClick: true,
            maxWidth: "none",
          })
        }
        if (isPrivateGuide) {
          // Encadre inicial de la guía (maxZoom acotado)
          requestAnimationFrame(() => {
            if (!disposedRef.current) fitAllPlaces({ maxZoom: 13, padding: 56 })
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const friendly = /webgl|Failed to initialize/i.test(message)
          ? "Failed to initialize WebGL"
          : message
        console.error("[MapboxMap] init failed", friendly)
        safeSetInitError(friendly)
        // NO rethrow: Error Boundary no atrapa useEffect
      }

      return () => {
        destroyMap(map.current)
      }
      // Solo montar/desmontar: evita reinits por cambios de props y limpia en unmount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // WebView Android: canvas queda mal dimensionado tras background / IME / Settings.
    useEffect(() => {
      const resize = () => {
        const instance = map.current
        if (!instance || disposedRef.current) return
        try {
          instance.resize()
        } catch {
          /* ignore */
        }
      }

      const onVisibility = () => {
        if (document.visibilityState === "visible") resize()
      }
      document.addEventListener("visibilitychange", onVisibility)
      window.addEventListener("resize", resize)

      let removeAppListener: (() => void) | undefined
      let cancelled = false
      if (isNativeApp()) {
        void import("@capacitor/app").then(({ App }) => {
          if (cancelled) return
          const handle = App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) resize()
          })
          removeAppListener = () => {
            void handle.then((listener) => listener.remove())
          }
        })
      }

      return () => {
        cancelled = true
        document.removeEventListener("visibilitychange", onVisibility)
        window.removeEventListener("resize", resize)
        removeAppListener?.()
      }
    }, [])

    // GeolocateControl: punto azul de ubicación del usuario (solo en mobile, se activa con FAB)
    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current || !enableGeolocate) return
      if (isE2eMapboxMockEnabled()) return

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
        if (geolocateControlRef.current === geolocate) {
          geolocateControlRef.current = null
        }
        // Ownership: no removeControl sync acá.
        // En unmount, destroyMap → map.remove() quita el control.
        // En toggle enableGeolocate, microtask removeControl si el mapa sigue vivo.
        mapTeardownRef.current.releaseControl(geolocate, m as unknown as MapboxTeardownMap)
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
        zoom: PIN_FOCUS_ZOOM,
        duration: reduceMotion ? 0 : 1000,
      })
    }, [searchQuery, places, reduceMotion])

    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current) return
      const onLoadOrMoveEnd = () => {
        if (disposedRef.current || !map.current) return
        try {
          setMarkerLayoutVersion((version) => version + 1)
          const b = m.getBounds()
          if (!b) return
          onBoundsChangeRef.current?.(b)
        } catch {
          /* mapa destruido */
        }
      }
      let moveTimer: ReturnType<typeof setTimeout> | null = null
      const onMoveEndDebounced = () => {
        onLoadOrMoveEnd()
        if (moveTimer) clearTimeout(moveTimer)
        moveTimer = setTimeout(() => {
          if (disposedRef.current || !map.current) return
          try {
            const b = m.getBounds()
            if (!b) return
            onMoveEndRef.current?.(m.getZoom(), {
              west: b.getWest(),
              south: b.getSouth(),
              east: b.getEast(),
              north: b.getNorth(),
            })
          } catch {
            /* mapa destruido */
          }
        }, MAP_MOVE_DEBOUNCE_MS)
      }
      const emitViewChange = () => {
        viewListenersRef.current.forEach((listener) => {
          try {
            listener()
          } catch {
            /* ignore */
          }
        })
      }
      m.on("load", onMoveEndDebounced)
      m.on("moveend", onMoveEndDebounced)
      m.on("move", emitViewChange)
      return () => {
        if (moveTimer) clearTimeout(moveTimer)
        try {
          m.off("load", onMoveEndDebounced)
          m.off("moveend", onMoveEndDebounced)
          m.off("move", emitViewChange)
        } catch {
          /* ignore */
        }
      }
    }, [])

    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current) return
      if (useNumberedMarkers) return
      if (isE2eMapboxMockEnabled()) return

      const setup = () => {
        if (disposedRef.current || !map.current) return
        const instance = map.current
        ensurePlacesLayers(instance, reduceMotion, false)
        setPlacesSourceData(instance, placesRef.current)
        void loadCeliMapPinImages(instance).then((pinsReady) => {
          if (disposedRef.current || map.current !== instance) return
          ensurePlacesLayers(instance, reduceMotion, pinsReady)
          setPlacesSourceData(instance, placesRef.current)
        })
      }

      if (m.isStyleLoaded?.() ?? m.loaded?.()) setup()
      else m.once("load", setup)
    }, [places, reduceMotion, useNumberedMarkers])

    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current || useNumberedMarkers) return
      if (isE2eMapboxMockEnabled()) return

      const onMapClick = (e: mapboxgl.MapMouseEvent) => {
        const hit = queryPlaceOrClusterAt(m, e.point)
        if (!hit) {
          onBackgroundClickRef.current?.()
          return
        }
        if (hit.kind === "cluster") {
          expandClusterAt(m, hit.clusterId, [e.lngLat.lng, e.lngLat.lat], reduceMotion)
          return
        }
        const place = placesRef.current.find(
          (item) => item._id != null && String(item._id) === hit.id
        )
        if (!place) return
        onPlaceSelectRef.current?.(place)
        if (
          !isPrivateGuideRef.current &&
          showPopupRef.current &&
          sharedPopupRef.current &&
          map.current
        ) {
          sharedPopupRef.current
            .setLngLat([place.location.lng, place.location.lat])
            .setHTML(buildPlacePopupHtml(place))
            .addTo(map.current)
        }
      }

      const pointer = () => {
        m.getCanvas().style.cursor = "pointer"
      }
      const reset = () => {
        m.getCanvas().style.cursor = ""
      }

      let bound = false
      const interactiveLayers = [LAYER_SELECTED_PIN, LAYER_CLUSTERS, LAYER_PINS, LAYER_PIN_FALLBACK]
      const tryBind = () => {
        if (bound || disposedRef.current) return
        const ready = interactiveLayers.some((id) => Boolean(m.getLayer(id)))
        if (!ready) return
        bound = true
        m.on("click", onMapClick)
        interactiveLayers.forEach((id) => {
          if (!m.getLayer(id)) return
          m.on("mouseenter", id, pointer)
          m.on("mouseleave", id, reset)
        })
      }

      tryBind()
      m.on("idle", tryBind)
      const poll = window.setInterval(tryBind, 250)

      return () => {
        window.clearInterval(poll)
        try {
          m.off("idle", tryBind)
          if (bound) {
            m.off("click", onMapClick)
            interactiveLayers.forEach((id) => {
              m.off("mouseenter", id, pointer)
              m.off("mouseleave", id, reset)
            })
          }
        } catch {
          /* ignore */
        }
      }
    }, [reduceMotion, useNumberedMarkers])

    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current || useNumberedMarkers) return
      if (isE2eMapboxMockEnabled()) return
      const selected =
        selectedPlaceId
          ? places.find((place) => place._id != null && String(place._id) === selectedPlaceId) ?? null
          : null
      const hovered =
        !selected && hoveredPlaceId
          ? places.find((place) => place._id != null && String(place._id) === hoveredPlaceId) ?? null
          : null
      try {
        setSelectedPlaceOnMap(m, selected ?? hovered, selected ? "selected" : "hovered")
      } catch {
        /* source still not ready */
      }
    }, [selectedPlaceId, hoveredPlaceId, places, useNumberedMarkers])

    useEffect(() => {
      const m = map.current
      if (!m || disposedRef.current) return
      if (isE2eMapboxMockEnabled()) return
      if (!useNumberedMarkers) {
        markerEntriesRef.current.forEach((entry) => entry.marker.remove())
        markerEntriesRef.current.clear()
        return
      }

      const nextMarkerIds = new Set<string>()

      markerItems.forEach((item) => {
        if (item.kind !== "place") return
        nextMarkerIds.add(item.id)
        const safety = inferSafetyLevel(item.place) ?? "unknown"
        const markerNumber = placeNumberByIdRef.current.get(item.id)
        const existingEntry = markerEntriesRef.current.get(item.id)

        if (existingEntry) {
          existingEntry.item = item
          existingEntry.marker.setLngLat([item.lng, item.lat])
          existingEntry.inner.innerHTML = celimapPinMarkup(
            safety,
            markerNumber != null ? String(markerNumber) : undefined
          )
          applyMarkerSelection(
            existingEntry,
            selectedPlaceIdRef.current === item.id,
            hoveredPlaceIdRef.current === item.id
          )
          return
        }

        const el = document.createElement("div")
        el.className = "mapboxgl-marker"
        el.style.cssText = "display:flex;align-items:flex-end;justify-content:center;cursor:pointer;"
        const safetyLabel =
          safety !== "unknown" ? getSafetyBadge(safety).label : null
        const tip = safetyLabel ? `${item.place.name} · ${safetyLabel}` : item.place.name
        el.title = tip
        if (markerNumber != null) {
          el.setAttribute("aria-label", `${markerNumber}. ${tip}`)
        }

        const inner = document.createElement("div")
        inner.style.cssText = `
          width: 100%;
          height: 100%;
          transform-origin: center bottom;
          transition: ${reduceMotion ? "none" : "transform 0.2s ease, box-shadow 0.2s ease"};
        `
        inner.innerHTML = celimapPinMarkup(
          safety,
          markerNumber != null ? String(markerNumber) : undefined
        )
        const iconEl = document.createElement("span")
        el.appendChild(inner)

        el.addEventListener("click", (e) => {
          e.stopPropagation()
          const currentItem = markerEntriesRef.current.get(item.id)?.item ?? item
          if (currentItem.kind !== "place") return
          onPlaceSelectRef.current?.(currentItem.place)
        })

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([item.lng, item.lat])
          .addTo(m)

        const entry: MarkerEntry = { marker, element: el, inner, icon: iconEl, item }
        markerEntriesRef.current.set(item.id, entry)
        applyMarkerSelection(
          entry,
          selectedPlaceIdRef.current === item.id,
          hoveredPlaceIdRef.current === item.id
        )
      })

      markerEntriesRef.current.forEach((entry, markerId) => {
        if (nextMarkerIds.has(markerId)) return
        entry.marker.remove()
        markerEntriesRef.current.delete(markerId)
      })
    }, [applyMarkerSelection, markerItems, reduceMotion, useNumberedMarkers])

    useEffect(() => {
      markerEntriesRef.current.forEach((entry, placeId) => {
        if (entry.item.kind !== "place") return
        applyMarkerSelection(
          entry,
          placeId === selectedPlaceId,
          placeId === hoveredPlaceId
        )
      })
      if (!effectiveShowPopup) {
        try {
          sharedPopupRef.current?.remove()
        } catch {
          /* ignore */
        }
      }
    }, [selectedPlaceId, hoveredPlaceId, applyMarkerSelection, effectiveShowPopup])

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

      const place = places.find((p) => p._id != null && String(p._id) === selectedPlaceId)
      const lng = place?.location?.lng
      const lat = place?.location?.lat
      if (place && Number.isFinite(lng) && Number.isFinite(lat)) {
        lastFocusedPlaceIdRef.current = selectedPlaceId
        try {
          const currentZoom = map.current.getZoom()
          const zoom = isPrivateGuide
            ? Math.min(Math.max(currentZoom, 12), 14)
            : PIN_FOCUS_ZOOM
          map.current.easeTo({
            center: [lng as number, lat as number],
            zoom,
            duration: reduceMotion ? 0 : 700,
          })
        } catch {
          /* mapa destruido */
        }
      }
    }, [selectedPlaceId, places, reduceMotion, isPrivateGuide])

    if (initError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-card px-4 text-center">
          <p className="text-sm font-semibold text-olive">No pudimos cargar el mapa</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {initError === "Mapa no configurado"
              ? "Falta la configuración del mapa en este entorno."
              : "Este dispositivo no pudo iniciar el mapa. Usá la lista de lugares."}
          </p>
        </div>
      )
    }

    return <div ref={mapContainer} className="h-full w-full" data-overflow-allowed="mapbox-canvas" />
  }
)

MapboxMap.displayName = "MapboxMap"
