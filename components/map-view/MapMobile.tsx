"use client"

import * as React from "react"
import { List, X } from "lucide-react"
import { MapboxMap, type MapboxMapRef, type MapViewportBounds } from "./MapboxMap"
import { MapErrorBoundary } from "./MapErrorBoundary"
import { MapTopBar, type MapFilters } from "./MapTopBar"
import { MapBottomSheet, type SheetSnap } from "./BottomSheet"
import { PlacesList } from "./PlacesList"
import { MobileMapBottomSheet, MOBILE_SHEET_COMPACT_PX } from "./MobileMapBottomSheet"
import { FabButtons } from "./FabButtons"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { toast } from "sonner"
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
  placeIdToFocus,
  listOpen = false,
  onSheetCollapse,
  onListOpen,
  onMapMoveEnd,
}: MapMobileProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const lastFocusedPlaceIdRef = React.useRef<string | null>(null)
  const [bounds, setBounds] = React.useState<mapboxgl.LngLatBounds | null>(null)
  const [locating, setLocating] = React.useState(false)
  const [mapKey, setMapKey] = React.useState(0)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [sheetHeight, setSheetHeight] = React.useState(MOBILE_SHEET_COMPACT_PX)

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

  const triggerMapboxGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización")
      return
    }
    toast.loading("Obteniendo tu ubicación...", { id: "location" })
    mapRef.current?.triggerGeolocate()
    setTimeout(() => toast.dismiss("location"), 5000)
  }

  const goToNearMe = () => {
    if (locating) return

    if (!window.isSecureContext) {
      toast.error("La ubicación solo funciona en sitios seguros (HTTPS).")
      return
    }

    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización")
      return
    }

    setLocating(true)
    toast.loading("Obteniendo tu ubicación...", { id: "location" })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        mapRef.current?.showUserLocation(longitude, latitude)
        mapRef.current?.flyTo(longitude, latitude, 16)
        toast.success("Ubicación encontrada", { id: "location" })
        setLocating(false)
      },
      (error) => {
        toast.dismiss("location")
        setLocating(false)

        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "No se pudo acceder a tu ubicación. Activá el permiso de ubicación para este sitio en la configuración del navegador.",
            { action: { label: "Reintentar", onClick: goToNearMe } }
          )
          return
        }

        if (error.code === error.TIMEOUT) {
          toast.error("La ubicación tardó demasiado. Revisá el GPS/señal e intentá de nuevo.", {
            action: { label: "Reintentar", onClick: goToNearMe },
          })
          return
        }

        toast.error("No se pudo obtener tu ubicación. Revisá que el GPS esté activado.", {
          action: { label: "Reintentar", onClick: goToNearMe },
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    )
  }

  const handleGeolocateError = React.useCallback((error: GeolocationPositionError) => {
    toast.dismiss("location")
    const retry = () => {
      toast.loading("Obteniendo tu ubicación...", { id: "location" })
      triggerMapboxGeolocate()
    }
    if (error.code === 1) {
      toast.error(
        "No se pudo acceder a tu ubicación. Si la bloqueaste antes, activala en la configuración del navegador.",
        { action: { label: "Reintentar", onClick: retry } }
      )
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
    if (place.location && mapRef.current) {
      mapRef.current.flyTo(place.location.lng, place.location.lat, 16)
    }
  }

  const handleSnapChange = React.useCallback(
    (snap: SheetSnap) => {
      if (snap === "collapsed") onSheetCollapse?.()
    },
    [onSheetCollapse]
  )

  React.useEffect(() => {
    if (!placeIdToFocus || !mapRef.current) {
      lastFocusedPlaceIdRef.current = null
      return
    }
    if (lastFocusedPlaceIdRef.current === placeIdToFocus) return

    const place = places.find((p) => p._id.toString() === placeIdToFocus)
    if (place?.location) {
      lastFocusedPlaceIdRef.current = placeIdToFocus
      mapRef.current.flyTo(place.location.lng, place.location.lat, 16)
    }
  }, [placeIdToFocus, places])

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
    <div className="relative h-full min-h-[100dvh] w-full overflow-hidden">
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
          />
        </MapErrorBoundary>
      </div>

      {!listOpen && (
        <FabButtons
          onNearMe={goToNearMe}
          locating={locating}
          bottomOffset={
            selectedPlace
              ? `calc(var(--bottom-nav-clearance) + ${sheetHeight + 16}px)`
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
            className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-5"
          >
            <List className="h-4 w-4" aria-hidden />
            Ver {visiblePlaces.length} lugar{visiblePlaces.length !== 1 ? "es" : ""}
          </button>
        </div>
      )}

      {selectedPlace && (
        <MobileMapBottomSheet
          place={selectedPlace}
          onClose={() => onPlaceDeselect?.()}
          reduceMotion={reduceMotion}
          onHeightChange={setSheetHeight}
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
            className="relative z-10 flex min-h-0 max-h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border border-olive/15 bg-card shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5">
              <h2 className="text-base font-semibold text-olive">Más filtros</h2>
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
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    filters.type === type.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-olive/10 bg-olive/5 text-muted-foreground"
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
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    filters.tags.includes(chip.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-olive/10 bg-olive/5 text-muted-foreground"
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
