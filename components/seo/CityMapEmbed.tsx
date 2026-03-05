"use client"

import { useEffect, useState, useCallback } from "react"
import { MapScreen, type MapFilters } from "@/components/map-view"
import type { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getCityCenter } from "@/lib/seo/cities"

interface CityMapEmbedProps {
  citySlug: string
  cityName: string
}

export function CityMapEmbed({ citySlug, cityName }: CityMapEmbedProps) {
  const centerConfig = getCityCenter(citySlug)
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
      const params = new URLSearchParams()
      params.append("limit", "999")
      params.append("citySlugs", citySlug)
      const data = await fetchApi<{ places: IPlace[] }>(`/api/places?${params.toString()}`)
      setPlaces(data.places || [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar lugares")
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [citySlug])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  return (
    <section className="border rounded-xl overflow-hidden bg-card/50">
      <div className="h-[min(500px,70vh)] min-h-[360px] relative">
        <MapScreen
          places={places}
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
          searchQuery=""
          selectedPlaceId={selectedPlaceId}
          onPlaceSelect={(p) => setSelectedPlaceId(p._id.toString())}
          initialCenter={centerConfig?.center}
          initialZoom={centerConfig?.zoom}
          placeIdToFocus={null}
          listOpen={false}
        />
      </div>
      <div className="p-3 border-t bg-muted/30 flex justify-center">
        <Link
          href={
            centerConfig
              ? `/mapa?citySlugs=${citySlug}&lng=${centerConfig.center[0]}&lat=${centerConfig.center[1]}&zoom=${centerConfig.zoom}`
              : `/mapa?citySlugs=${citySlug}`
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Ver mapa completo de {cityName}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
