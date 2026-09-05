"use client"

import * as React from "react"
import { List, X } from "lucide-react"
import { MapboxMap, type MapboxMapRef, type MapViewportBounds } from "./MapboxMap"
import { MapErrorBoundary } from "./MapErrorBoundary"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { MapBottomSheet, type SheetSnap } from "./BottomSheet"
import { PlacesList } from "./PlacesList"
import { MobileMapBottomSheet, MOBILE_SHEET_COMPACT_PX, MOBILE_SHEET_EXPANDED_PX, CAMERA_SHEET_GAP_PX, type PlaceSheetSnap } from "./MobileMapBottomSheet"
import { FabButtons } from "./FabButtons"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { toast } from "sonner"
import {
  locationPermissionBlockedRetryCopy,
  locationPermissionDeniedCopy,
} from "@/lib/native-location-copy"
import { registerAndroidMapBackHandlers } from "@/lib/native-android-back"
import {
  getLocationAutoEnabled,
  setLocationAutoEnabled,
} from "@/lib/location-preference"
import mapboxgl from "mapbox-gl"
import { filterPlacesInBounds } from "./geo"
import { cn } from "@/lib/utils"
import { TYPES } from "@/lib/constants"
import type { IPlace } from "@/models/Place"

interface MapMobileProps {
  places: IPlace[]
  loading: boolean
  loadError?: string | null
  onRetryLoad?: () => void
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  searchQuery?: string
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
  onPlaceDeselect?: () => void
  initialCenter?: [number, number]
  initialZoom?: number
  placeIdToFocus?: string | null
  listOpen?: boolean
  onSheetCollapse?: () => void
  onListOpen?: () => void
  onMapMoveEnd?: (zoom: number, bounds: MapViewportBounds) => void
}

const TAG_CHIPS = [
  { id: "cocina_separada", label: "Cocina separada" },
  { id: "certificado_sin_tacc", label: "Insumos certificados" },
  { id: "delivery", label: "Delivery" },
] as const

function VerLugaresCount({
  count,
  reduceMotion,
}: {
  count: number
  reduceMotion: boolean
}) {
  const [shown, setShown] = React.useState(count)
  const [leaving, setLeaving] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (count === shown) return
    if (reduceMotion) {
      setShown(count)
      setLeaving(null)
      return
    }
    setLeaving(shown)
    setShown(count)
  }, [count, shown, reduceMotion])

  return (
    <span className="relative inline-block min-w-[1.25ch] text-right align-baseline">
      {leaving != null ? (
        <span
          className="absolute inset-0 map-count-out"
          onAnimationEnd={() => setLeaving(null)}
        >
          {leaving}
        </span>
      ) : null}
      <span className={cn("inline-block", leaving != null && "map-count-in")}>
        {shown}
      </span>
    </span>
  )
}

function readCssVarPx(varName: string): number {
  if (typeof document === "undefined") return 0
  const probe = document.createElement("div")
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:var(${varName})`
  document.body.appendChild(probe)
  const px = probe.getBoundingClientRect().height
  probe.remove()
  return Number.isFinite(px) ? Math.round(px) : 0
}

export function MapMobile({
  places,
  loading,
  loadError = null,
  onRetryLoad,
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery,
  selectedPlaceId,
  onPlaceSelect,
  onPlaceDeselect,
  initialCenter,
  initialZoom,
  placeIdToFocus: _placeIdToFocus,
  listOpen = false,
  onSheetCollapse,
  onListOpen,
  onMapMoveEnd,
}: MapMobileProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = React.useState<mapboxgl.LngLatBounds | null>(null)
  const [locating, setLocating] = React.useState(false)
  const locatingRef = React.useRef(false)
  const autoLocationAttemptedRef = React.useRef(false)
  const [mapKey, setMapKey] = React.useState(0)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [sheetSnap, setSheetSnap] = React.useState<PlaceSheetSnap>("compact")
  const [snapPlaceId, setSnapPlaceId] = React.useState(selectedPlaceId)
  const [overlayInsets, setOverlayInsets] = React.useState<{ top: number; nav: number } | null>(null)

  if (selectedPlaceId !== snapPlaceId) {
    setSnapPlaceId(selectedPlaceId)
    setSheetSnap("compact")
  }

  const measureOverlays = React.useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const nav = readCssVarPx("--bottom-nav-clearance")
    const topBar = root.querySelector("[data-map-topbar]")
    const mapBox = root.getBoundingClientRect()
    const top = topBar
      ? Math.max(0, Math.round(topBar.getBoundingClientRect().bottom - mapBox.top))
      : 0
    setOverlayInsets((prev) =>
      prev && prev.top === top && prev.nav === nav ? prev : { top, nav }
    )
  }, [])

  React.useLayoutEffect(() => {
    measureOverlays()
    const root = rootRef.current
    if (!root || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measureOverlays())
    ro.observe(root)
    const topBar = root.querySelector("[data-map-topbar]")
    if (topBar) ro.observe(topBar)
    window.addEventListener("resize", measureOverlays)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measureOverlays)
    }
  }, [measureOverlays, listOpen])

  const visiblePlaces = React.useMemo(() => {
    if (searchQuery?.trim()) return places
    if (!bounds) return places
    const inBounds = filterPlacesInBounds(places, bounds)
    if (!selectedPlaceId) return inBounds
    const selected = places.find((p) => p._id.toString() === selectedPlaceId)
    if (selected && !inBounds.some((p) => p._id.toString() === selectedPlaceId)) {
      return [selected, ...inBounds]
    }
    return inBounds
  }, [places, bounds, selectedPlaceId, searchQuery])

  const selectedPlace = React.useMemo(
    () => places.find((p) => p._id.toString() === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

  const sheetPx = selectedPlace
    ? sheetSnap === "expanded"
      ? MOBILE_SHEET_EXPANDED_PX
      : MOBILE_SHEET_COMPACT_PX
    : 0
  const overlayPadding = React.useMemo(
    () =>
      overlayInsets
        ? {
            top: overlayInsets.top,
            bottom: overlayInsets.nav + sheetPx + (sheetPx > 0 ? CAMERA_SHEET_GAP_PX : 0),
          }
        : false,
    [overlayInsets, sheetPx]
  )

  const triggerMapboxGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización")
      return
    }
    toast.loading("Obteniendo tu ubicación...", { id: "location" })
    mapRef.current?.triggerGeolocate()
    setTimeout(() => toast.dismiss("location"), 5000)
  }

  const goToNearMe = React.useCallback((options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (locatingRef.current) return

    if (!window.isSecureContext) {
      if (!silent) {
        toast.error("La ubicación solo funciona en sitios seguros (HTTPS).")
      }
      return
    }

    if (!navigator.geolocation) {
      if (!silent) {
        toast.error("Tu navegador no soporta geolocalización")
      }
      return
    }

    locatingRef.current = true
    setLocating(true)
    if (!silent) {
      toast.loading("Obteniendo tu ubicación...", { id: "location" })
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        mapRef.current?.showUserLocation(longitude, latitude)
        mapRef.current?.flyTo(longitude, latitude, 16)
        if (!silent) {
          toast.success("Ubicación encontrada", { id: "location" })
          setLocationAutoEnabled(true)
        }
        locatingRef.current = false
        setLocating(false)
      },
      (error) => {
        if (!silent) {
          toast.dismiss("location")
        }
        locatingRef.current = false
        setLocating(false)

        if (error.code === error.PERMISSION_DENIED) {
          if (silent) {
            return
          }
          toast.error(locationPermissionDeniedCopy(), {
            action: { label: "Reintentar", onClick: () => goToNearMe() },
          })
          return
        }

        if (silent) {
          return
        }

        if (error.code === error.TIMEOUT) {
          toast.error("La ubicación tardó demasiado. Revisá el GPS/señal e intentá de nuevo.", {
            action: { label: "Reintentar", onClick: () => goToNearMe() },
          })
          return
        }

        toast.error("No se pudo obtener tu ubicación. Revisá que el GPS esté activado.", {
          action: { label: "Reintentar", onClick: () => goToNearMe() },
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    )
  }, [])

  React.useEffect(() => {
    if (autoLocationAttemptedRef.current) return
    autoLocationAttemptedRef.current = true
    if (!getLocationAutoEnabled()) return
    goToNearMe({ silent: true })
  }, [goToNearMe])

  const handleGeolocateError = React.useCallback((error: GeolocationPositionError) => {
    toast.dismiss("location")
    const retry = () => {
      toast.loading("Obteniendo tu ubicación...", { id: "location" })
      triggerMapboxGeolocate()
    }
    if (error.code === 1) {
      toast.error(locationPermissionBlockedRetryCopy(), {
        action: { label: "Reintentar", onClick: retry },
      })
    } else {
      toast.error("No se pudo obtener tu ubicación. Revisá que el GPS esté activado.", {
        action: { label: "Reintentar", onClick: retry },
      })
    }
  }, [])

  const handleGeolocateSuccess = React.useCallback(() => {
    toast.success("Ubicación encontrada", { id: "location" })
  }, [])

  const handlePlaceSelect = (place: IPlace) => {
    onPlaceSelect(place)
    if (listOpen) onSheetCollapse?.()
  }

  const handleSnapChange = React.useCallback(
    (snap: SheetSnap) => {
      if (snap === "collapsed") onSheetCollapse?.()
    },
    [onSheetCollapse]
  )

  React.useEffect(() => {
    registerAndroidMapBackHandlers({
      moreFiltersOpen: moreOpen,
      placeSheetOpen: Boolean(selectedPlace),
      closeMoreFilters: () => setMoreOpen(false),
      closePlaceSheet: () => onPlaceDeselect?.(),
    })
    return () => registerAndroidMapBackHandlers(null)
  }, [moreOpen, selectedPlace, onPlaceDeselect])

  const clearExtraFilters = () => {
    onFiltersChange({
      ...filters,
      type: undefined,
      tags: filters.tags.filter((t) => t === "100_gf" || t === "opciones_sin_tacc"),
    })
  }

  const hasExtraFilters =
    Boolean(filters.type) ||
    filters.tags.some((t) => t !== "100_gf" && t !== "opciones_sin_tacc")

  return (
    <div ref={rootRef} className="relative h-full min-h-[100dvh] w-full overflow-hidden">
      <MapTopBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onFiltersOpen={() => setMoreOpen(true)}
        compact={listOpen}
        placeholder="Buscar lugar o zona..."
      />

      <div className="absolute inset-0">
        <MapErrorBoundary key={mapKey} onRetry={() => setMapKey((k) => k + 1)}>
          <MapboxMap
            ref={mapRef}
            places={places}
            selectedPlaceId={selectedPlaceId ?? undefined}
            onPlaceSelect={handlePlaceSelect}
            onBackgroundClick={() => {
              if (listOpen) onSheetCollapse?.()
              onPlaceDeselect?.()
            }}
            onBoundsChange={setBounds}
            onMoveEnd={onMapMoveEnd}
            searchQuery={searchQuery}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            reduceMotion={reduceMotion}
            enableGeolocate
            onGeolocateError={handleGeolocateError}
            onGeolocateSuccess={handleGeolocateSuccess}
            clusterMarkers
            colorBySafety
            showPopup={false}
            overlayPadding={overlayPadding}
          />
        </MapErrorBoundary>
      </div>

      {!listOpen && sheetSnap !== "expanded" && (
        <FabButtons
          onNearMe={() => goToNearMe()}
          locating={locating}
          bottomOffset={
            selectedPlace
              ? `calc(var(--bottom-nav-clearance) + ${MOBILE_SHEET_COMPACT_PX + 16}px)`
              : "calc(var(--bottom-nav-clearance) + 0.5rem)"
          }
        />
      )}

      {!listOpen && !selectedPlace && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 flex flex-col items-center gap-2 px-3"
          data-overflow-allowed="decoration"
        >
          <button
            type="button"
            onClick={() => onListOpen?.()}
            className="pointer-events-auto inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-[#1F4D35]/12 bg-[#FDFBF7]/92 px-4 py-2.5 text-sm font-semibold tracking-[0.01em] text-[#1F4D35] shadow-[0_8px_24px_-12px_rgba(45,74,52,0.28)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-5"
          >
            <List className="h-4 w-4 shrink-0 stroke-[1.85]" aria-hidden />
            <span className="inline-flex items-baseline gap-1">
              <span>Ver</span>
              <VerLugaresCount count={visiblePlaces.length} reduceMotion={reduceMotion} />
              <span>{`lugar${visiblePlaces.length !== 1 ? "es" : ""}`}</span>
            </span>
          </button>
        </div>
      )}

      {selectedPlace && (
        <MobileMapBottomSheet
          key={String(selectedPlace._id)}
          place={selectedPlace}
          onClose={() => onPlaceDeselect?.()}
          reduceMotion={reduceMotion}
          onSnapChange={setSheetSnap}
        />
      )}

      {listOpen && !selectedPlace && (
        <MapBottomSheet
          initialSnap="half"
          onSnapChange={handleSnapChange}
          reduceMotion={reduceMotion}
        >
          <div className="pt-2">
            <PlacesList
              places={visiblePlaces}
              selectedPlaceId={selectedPlaceId}
              loading={loading}
              loadError={loadError}
              onRetryLoad={onRetryLoad}
              onPlaceSelect={handlePlaceSelect}
              onClearFilters={hasExtraFilters || filters.tags.length > 0 ? () => {
                onFiltersChange({
                  search: filters.search,
                  tags: [],
                  type: undefined,
                  neighborhood: undefined,
                  safetyLevel: undefined,
                })
              } : undefined}
            />
          </div>
        </MapBottomSheet>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-3 pb-[var(--bottom-nav-clearance)] pt-[calc(var(--safe-area-top)+0.75rem)]">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Más filtros"
            className="map-paper relative z-10 flex min-h-0 max-h-full w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-[var(--map-paper-border)]"
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5">
              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[#1F4D35]">Más filtros</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-olive/10 hover:text-olive"
                aria-label="Cerrar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de lugar
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={filters.type === type.value}
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      type: filters.type === type.value ? undefined : type.value,
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.01em]",
                    filters.type === type.value
                      ? "border-[#1F4D35] bg-[#1F4D35] text-[#F7F3EB]"
                      : "border-[#1F4D35]/12 bg-transparent text-[#1F4D35]/70"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Características
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={filters.tags.includes(chip.id)}
                  onClick={() => {
                    const tags = filters.tags.includes(chip.id)
                      ? filters.tags.filter((t) => t !== chip.id)
                      : [...filters.tags, chip.id]
                    onFiltersChange({ ...filters, tags })
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.01em]",
                    filters.tags.includes(chip.id)
                      ? "border-[#1F4D35] bg-[#1F4D35] text-[#F7F3EB]"
                      : "border-[#1F4D35]/12 bg-transparent text-[#1F4D35]/70"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {hasExtraFilters && (
              <button
                type="button"
                onClick={clearExtraFilters}
                className="mt-4 text-xs font-medium text-muted-foreground"
              >
                Limpiar filtros extra
              </button>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
