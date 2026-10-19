"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { MapScreen } from "@/components/map-view/MapScreen"
import type { MapFilters } from "@/components/map-view/MapTopBar"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/places-limits"

export type LandingMapProps = {
  /** Filtros de /api/places sin limit, p. ej. "provinceSlugs=cordoba&localitySlugs=cordoba". */
  apiQuery: string
  initialCenter?: [number, number]
  initialZoom?: number
}

/**
 * Mapa interactivo de una landing (ciudad o provincia). Trae Mapbox, así que se
 * carga solo cuando la persona lo pide (ver LandingMapLazy).
 */
export function LandingMap({ apiQuery, initialCenter, initialZoom }: LandingMapProps) {
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapFilters>({
    search: "",
    tags: [],
    type: undefined,
    neighborhood: undefined,
    safetyLevel: undefined,
  })

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApi<{ places: IPlace[] }>(
        `/api/places?limit=${PUBLIC_PLACES_MAX_LIMIT}&${apiQuery}`
      )
      setPlaces(data.places || [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar lugares")
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [apiQuery])

  useEffect(() => {
    void fetchPlaces()
  }, [fetchPlaces])

  return (
    <MapScreen
      places={places}
      loading={loading}
      filters={filters}
      onFiltersChange={setFilters}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      searchQuery=""
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={(p) => setSelectedPlaceId(p._id.toString())}
      onPlaceDeselect={() => setSelectedPlaceId(null)}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      placeIdToFocus={null}
      listOpen={false}
    />
  )
}
