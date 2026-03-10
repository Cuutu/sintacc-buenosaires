"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { MapboxMap, type MapboxMapRef } from "./MapboxMap"
import { MapTopBar, type MapFilters, type SortOption } from "./MapTopBar"
import { PlacesList } from "./PlacesList"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { filterPlacesInBounds } from "./geo"
import { cn } from "@/lib/utils"
import type { IPlace } from "@/models/Place"
import { X } from "lucide-react"

interface MapDesktopProps {
  places: IPlace[]
  loading: boolean
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  onSearchChange: (search: string) => void
  searchQuery?: string
  selectedPlaceId: string | null
  onPlaceSelect: (place: IPlace) => void
  initialCenter?: [number, number]
  initialZoom?: number
  onMapMoveEnd?: (zoom: number) => void
}

export function MapDesktop({
  places,
  loading,
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery,
  selectedPlaceId,
  onPlaceSelect,
  initialCenter,
  initialZoom,
  onMapMoveEnd,
}: MapDesktopProps) {
  const reduceMotion = usePrefersReducedMotion()
  const mapRef = React.useRef<MapboxMapRef>(null)
  const [bounds, setBounds] = React.useState<mapboxgl.LngLatBounds | null>(null)
  const [sort, setSort] = React.useState<SortOption>("default")

  // Filtros activos para el badge flotante
  const activeFilters = React.useMemo(() => {
    const parts: string[] = []
    if (filters.safetyLevel === "dedicated_gf") parts.push("✅ 100% sin TACC")
    if (filters.safetyLevel === "gf_options") parts.push("🟡 Tiene opciones")
    if (filters.type) {
      const TYPES_MAP: Record<string, string> = {
        restaurant: "🍕 Restaurante", cafe: "☕ Café", bakery: "🥐 Panadería",
        store: "🛒 Tienda", icecream: "🍦 Heladería", bar: "🍺 Bar", other: "📍 Otro",
      }
      parts.push(TYPES_MAP[filters.type] ?? filters.type)
    }
    if (filters.tags.includes("certificado_sin_tacc")) parts.push("🛡 Certificado")
    if (filters.tags.includes("cocina_separada")) parts.push("🍳 Cocina sep.")
    if (filters.tags.includes("delivery")) parts.push("🚗 Delivery")
    return parts
  }, [filters])

  const hasActiveFilters = activeFilters.length > 0

  const clearAllFilters = () => {
    onFiltersChange({ search: filters.search, tags: [], type: undefined, neighborhood: undefined, safetyLevel: undefined })
  }

  // Lugares visibles en bounds
  const visiblePlaces = React.useMemo(() => {
    if (!bounds) return places
    const inBounds = filterPlacesInBounds(places, bounds)
    if (!selectedPlaceId) return inBounds
    const selected = places.find((p) => p._id.toString() === selectedPlaceId)
    if (selected && !inBounds.some((p) => p._id.toString() === selectedPlaceId)) {
      return [selected, ...inBounds]
    }
    return inBounds
  }, [places, bounds, selectedPlaceId])

  // Sort aplicado
  const sortedPlaces = React.useMemo(() => {
    if (sort === "rating") {
      return [...visiblePlaces].sort((a, b) => {
        const ra = (a as any).stats?.avgRating ?? 0
        const rb = (b as any).stats?.avgRating ?? 0
        return rb - ra
      })
    }
    if (sort === "newest") {
      return [...visiblePlaces].sort((a, b) => {
        const da = new Date((a as any).createdAt ?? 0).getTime()
        const db = new Date((b as any).createdAt ?? 0).getTime()
        return db - da
      })
    }
    return visiblePlaces
  }, [visiblePlaces, sort])

  return (
    <div className="grid grid-cols-12 h-full w-full">
      {/* Mapa */}
      <div className="col-span-7 relative">
        <MapboxMap
          ref={mapRef}
          places={places}
          selectedPlaceId={selectedPlaceId ?? undefined}
          onPlaceSelect={onPlaceSelect}
          onBoundsChange={setBounds}
          onMoveEnd={onMapMoveEnd}
          searchQuery={searchQuery}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          darkStyle={false}
          reduceMotion={reduceMotion}
        />

        {/* Badge filtros activos flotante sobre el mapa */}
        {hasActiveFilters && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 shadow-lg text-xs font-medium text-white whitespace-nowrap max-w-[420px] overflow-hidden">
              <span className="shrink-0 text-primary">●</span>
              <span className="truncate">
                {sortedPlaces.length} lugar{sortedPlaces.length !== 1 ? "es" : ""} · {activeFilters.join(" · ")}
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="shrink-0 ml-1 hover:text-white/60 transition-colors"
                title="Limpiar filtros"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel lateral */}
      <div className="col-span-5 border-l border-white/10 bg-black/40 backdrop-blur-xl overflow-y-auto flex flex-col">
        <MapTopBar
          variant="sidebar"
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          sort={sort}
          onSortChange={setSort}
        />
        <div className="px-4 pt-3 pb-1 flex items-center justify-between shrink-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{sortedPlaces.length}</span>
            {" "}lugar{sortedPlaces.length !== 1 ? "es" : ""} en el área
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
        <div className="flex-1 pt-2">
          <PlacesList
            places={sortedPlaces}
            selectedPlaceId={selectedPlaceId}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
