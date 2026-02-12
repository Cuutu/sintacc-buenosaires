"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { IPlace } from "@/models/Place"

const SEARCH_DEBOUNCE_MS = 300

function MapaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapFilters>(() => ({
    search: searchParams.get("search") || "",
    tags: [],
    type: undefined,
    neighborhood: undefined,
    safetyLevel: undefined,
  }))
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchParams.get("search") || ""
  )

  // Sincronizar URL ?search= con el estado cuando cambia la URL
  useEffect(() => {
    const urlSearch = searchParams.get("search") || ""
    setFilters((f) => (f.search !== urlSearch ? { ...f, search: urlSearch } : f))
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev))
  }, [searchParams])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filters.search])

  // Actualizar la URL cuando cambia el search (para que refresh/back mantenga la búsqueda)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || ""
    if (debouncedSearch === urlSearch) return
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
    else params.delete("search")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [debouncedSearch, pathname, router, searchParams])

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
      searchQuery={debouncedSearch}
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
