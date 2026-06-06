"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { ArrowUpRight, MapPin, Sparkles, X } from "lucide-react"
import { MapboxMap, type MapboxMapRef, type MapViewportBounds } from "./MapboxMap"
import { MapTopBar, type MapFilters, type SortOption } from "./MapTopBar"
import { PlacesList } from "./PlacesList"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { filterPlacesInBounds } from "./geo"
import { getPlacePath } from "@/lib/place-url"
import { getSafetyBadge, inferSafetyLevel } from "@/components/featured/featured-utils"
import type { IPlace } from "@/models/Place"

type PlaceWithStats = IPlace & {
  stats?: {
    avgRating?: number
    totalReviews?: number
    contaminationReportsCount?: number
  }
  createdAt?: Date | string
}

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
  onMapMoveEnd?: (zoom: number, bounds: MapViewportBounds) => void
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Otro",
}

const SORT_DESCRIPTIONS: Record<SortOption, string> = {
  default: "Orden original del mapa",
  rating: "Mejor rating primero",
  newest: "Más nuevos primero",
}

function getPlaceTimestamp(place: PlaceWithStats): number {
  const createdAt = place.createdAt ? new Date(place.createdAt).getTime() : 0
  if (Number.isFinite(createdAt) && createdAt > 0) return createdAt

  const id = place._id?.toString()
  if (id && /^[a-f\d]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000
  }

  return 0
}

function getRating(place: PlaceWithStats): number {
  return place.stats?.avgRating ?? 0
}

function getReviewCount(place: PlaceWithStats): number {
  return place.stats?.totalReviews ?? 0
}

function getSafetyRank(place: IPlace): number {
  const level = inferSafetyLevel(place)
  if (level === "dedicated_gf") return 3
  if (level === "gf_options") return 2
  if (level === "unknown") return 1
  return 0
}

function compareName(a: IPlace, b: IPlace): number {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" })
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

  const selectedPlace = React.useMemo(
    () => places.find((place) => place._id.toString() === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

  const activeFilters = React.useMemo(() => {
    const parts: string[] = []
    if (filters.safetyLevel === "dedicated_gf") parts.push("100% sin TACC")
    if (filters.safetyLevel === "gf_options") parts.push("Tiene opciones")
    if (filters.type) parts.push(TYPE_LABELS[filters.type] ?? filters.type)
    if (filters.tags.includes("certificado_sin_tacc")) parts.push("Certificado")
    if (filters.tags.includes("cocina_separada")) parts.push("Cocina separada")
    if (filters.tags.includes("delivery")) parts.push("Delivery")
    return parts
  }, [filters])

  const hasActiveFilters = activeFilters.length > 0

  const clearAllFilters = () => {
    onFiltersChange({
      search: filters.search,
      tags: [],
      type: undefined,
      neighborhood: undefined,
      safetyLevel: undefined,
    })
  }

  const visiblePlaces = React.useMemo(() => {
    if (searchQuery?.trim()) return places
    if (!bounds) return places
    const inBounds = filterPlacesInBounds(places, bounds)
    if (!selectedPlaceId) return inBounds
    const selected = places.find((place) => place._id.toString() === selectedPlaceId)
    if (selected && !inBounds.some((place) => place._id.toString() === selectedPlaceId)) {
      return [selected, ...inBounds]
    }
    return inBounds
  }, [places, bounds, selectedPlaceId, searchQuery])

  const sortedPlaces = React.useMemo(() => {
    const list = [...visiblePlaces] as PlaceWithStats[]

    if (sort === "rating") {
      return list.sort((a, b) => {
        const reviewDelta = Math.sign(getReviewCount(b)) - Math.sign(getReviewCount(a))
        if (reviewDelta !== 0) return reviewDelta

        const ratingDelta = getRating(b) - getRating(a)
        if (ratingDelta !== 0) return ratingDelta

        const countDelta = getReviewCount(b) - getReviewCount(a)
        if (countDelta !== 0) return countDelta

        const safetyDelta = getSafetyRank(b) - getSafetyRank(a)
        if (safetyDelta !== 0) return safetyDelta

        return compareName(a, b)
      })
    }

    if (sort === "newest") {
      return list.sort((a, b) => {
        const dateDelta = getPlaceTimestamp(b) - getPlaceTimestamp(a)
        if (dateDelta !== 0) return dateDelta
        return compareName(a, b)
      })
    }

    if (searchQuery?.trim()) {
      return list.sort((a, b) => {
        const safetyDelta = getSafetyRank(b) - getSafetyRank(a)
        if (safetyDelta !== 0) return safetyDelta

        const reviewPresenceDelta = Math.sign(getReviewCount(b)) - Math.sign(getReviewCount(a))
        if (reviewPresenceDelta !== 0) return reviewPresenceDelta

        return compareName(a, b)
      })
    }

    return list
  }, [searchQuery, visiblePlaces, sort])

  const selectedSafety = selectedPlace
    ? getSafetyBadge(inferSafetyLevel(selectedPlace) as any)
    : null

  return (
    <div className="grid h-full w-full grid-cols-12 bg-[#050807]">
      <div className="relative col-span-7 overflow-hidden">
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
          darkStyle
          reduceMotion={reduceMotion}
          clusterMarkers
        />

        {hasActiveFilters && (
          <div className="pointer-events-auto absolute left-1/2 top-4 z-10 -translate-x-1/2">
            <div className="flex max-w-[540px] items-center gap-2 overflow-hidden rounded-full border border-white/15 bg-[#080c0f]/78 px-3 py-2 text-xs font-medium text-white shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_14px_rgba(16,185,129,0.75)]" />
              <span className="truncate">
                {sortedPlaces.length} lugar{sortedPlaces.length !== 1 ? "es" : ""} · {activeFilters.join(" · ")}
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 shrink-0 text-white/62 transition hover:text-white"
                title="Limpiar filtros"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="col-span-5 flex min-w-0 flex-col overflow-y-auto border-l border-white/10 bg-[#070909]/96 shadow-[inset_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <MapTopBar
          variant="sidebar"
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          sort={sort}
          onSortChange={setSort}
        />

        {selectedPlace && (
          <section className="mx-5 mt-4 rounded-2xl border border-primary/25 bg-primary/[0.08] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.26)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  Seleccionado
                </div>
                <h2 className="truncate text-base font-bold text-white">{selectedPlace.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/62">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedPlace.neighborhood}
                </p>
              </div>
              <a
                href={getPlacePath(selectedPlace)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Ver detalle"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            {selectedSafety && (
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${selectedSafety.className}`}>
                {selectedSafety.label}
              </div>
            )}
          </section>
        )}

        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <p className="text-sm text-white/62">
            <span className="font-semibold text-white">{sortedPlaces.length}</span>
            {" "}lugar{sortedPlaces.length !== 1 ? "es" : ""}{searchQuery?.trim() ? "" : " en el área"}
            <span className="ml-2 text-xs text-white/36">· {SORT_DESCRIPTIONS[sort]}</span>
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-white/52 transition hover:text-white"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        <div className="flex-1 pt-1">
          <PlacesList
            places={sortedPlaces}
            selectedPlaceId={selectedPlaceId}
            loading={loading}
            onPlaceSelect={onPlaceSelect}
          />
        </div>
      </aside>
    </div>
  )
}
