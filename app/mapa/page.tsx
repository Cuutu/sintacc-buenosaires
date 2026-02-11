"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { IPlace } from "@/models/Place"

const SEARCH_DEBOUNCE_MS = 300

function MapaContent() {
  const searchParams = useSearchParams()
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapFilters>({
    search: searchParams.get("search") || "",
    tags: [],
    type: undefined,
    neighborhood: undefined,
    safetyLevel: undefined,
  })
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filters.search])

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "999") // El mapa debe mostrar todos los lugares
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (filters.type && filters.type !== "all") params.append("type", filters.type)
      if (filters.neighborhood && filters.neighborhood !== "all")
        params.append("neighborhood", filters.neighborhood)
      if (filters.tags?.length) params.append("tags", filters.tags.join(","))
      if (filters.safetyLevel) params.append("safetyLevel", filters.safetyLevel)

      const res = await fetch(`/api/places?${params.toString()}`)
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (error) {
      console.error("Error fetching places:", error)
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filters.type, filters.neighborhood, filters.tags, filters.safetyLevel])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  return (
    <MapScreen
      places={places}
      loading={loading}
      filters={filters}
      onFiltersChange={setFilters}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      selectedPlaceId={selectedPlaceId}
      onPlaceSelect={(place) => setSelectedPlaceId(place._id.toString())}
    />
  )
}

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-4rem)] flex items-center justify-center text-muted-foreground">
          Cargando mapa...
        </div>
      }
    >
      <MapaContent />
    </Suspense>
  )
}
