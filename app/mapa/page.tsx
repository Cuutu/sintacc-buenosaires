"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Map } from "@/components/map"
import { PlaceCard } from "@/components/place-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { IPlace } from "@/models/Place"
import { useSearchParams } from "next/navigation"
import { Search, Filter, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { NEIGHBORHOODS, TYPES } from "@/lib/constants"

const TYPES_WITH_ALL = [
  { value: "all", label: "Todos" },
  ...TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` })),
]

function MapaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    type: "all",
    neighborhood: "all",
  })
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 400)
    return () => clearTimeout(t)
  }, [filters.search])

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (filters.type && filters.type !== "all")
        params.append("type", filters.type)
      if (filters.neighborhood && filters.neighborhood !== "all")
        params.append("neighborhood", filters.neighborhood)

      const res = await fetch(`/api/places?${params.toString()}`)
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filters.type, filters.neighborhood])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  const goToNearMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setSelectedPlaceId(null)
        // Map component would need to accept center/zoom - for now we just show user location
        // Could add a marker or flyTo in Map
        window.dispatchEvent(
          new CustomEvent("map:goTo", { detail: { lat: latitude, lng: longitude } })
        )
      },
      () => {}
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-full relative overflow-hidden">
      {/* Barra de filtros sticky - arriba del mapa en mobile */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-0 md:absolute md:top-4 md:left-4 md:right-auto md:max-w-xs">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-12 h-12 min-h-[44px] text-base rounded-xl border-white/10 bg-background/95 backdrop-blur"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 min-h-[44px] min-w-[44px] rounded-xl shrink-0"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filtros"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        {showFilters && (
          <div className="flex overflow-x-auto gap-2 scrollbar-hide snap-x snap-mandatory pb-2">
            <div className="flex gap-2 min-w-0 shrink-0">
              {TYPES_WITH_ALL.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFilters({ ...filters, type: t.value })}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium min-h-[44px] shrink-0 snap-center transition-colors",
                    filters.type === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 border border-white/10 hover:bg-white/15"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {showFilters && (
          <div className="flex overflow-x-auto gap-2 scrollbar-hide mt-2">
            {NEIGHBORHOODS.filter((h) => h !== "Otro").map((hood) => (
              <button
                key={hood}
                type="button"
                onClick={() =>
                  setFilters({ ...filters, neighborhood: hood })
                }
                className={cn(
                  "px-4 py-2 rounded-full text-sm min-h-[44px] shrink-0",
                  filters.neighborhood === hood
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 border border-white/10"
                )}
              >
                {hood}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB Cerca mío */}
      <Button
        size="lg"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 md:bottom-6 md:right-6 h-14 w-14 min-h-[48px] min-w-[48px] rounded-full shadow-lg md:bottom-6"
        onClick={goToNearMe}
        aria-label="Ver lugares cerca mío"
      >
        <MapPin className="h-6 w-6" />
      </Button>

      {/* Map + Mobile Bottom Sheet */}
      <div className="flex-1 relative min-h-0">
        <Map
          places={places}
          selectedPlaceId={selectedPlaceId || undefined}
          onPlaceSelect={(p) => setSelectedPlaceId(p._id.toString())}
        />
        {/* Mobile: Bottom sheet overlays mapa */}
        <div className="md:hidden absolute inset-x-0 bottom-0 z-20">
          <BottomSheet collapsedHeight={160} halfHeight={50}>
            <div className="px-4 pb-4">
              <h2 className="text-lg font-semibold mb-4">Lugares</h2>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl h-24 bg-white/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : places.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No se encontraron lugares
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {places.length} lugar{places.length !== 1 ? "es" : ""}{" "}
                    encontrado{places.length !== 1 ? "s" : ""}
                  </p>
                  {places.map((place) => (
                    <PlaceCard
                      key={place._id.toString()}
                      place={place}
                      onMapClick={(p) => router.push(`/lugar/${p._id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </BottomSheet>
        </div>
      </div>

      {/* Desktop: Sidebar derecha */}
      <div
        className={`
          hidden md:flex md:flex-col md:w-[min(420px,40%)] md:min-w-[340px] 
          border-l border-border/50 bg-background/95 backdrop-blur-xl
          overflow-y-auto
        `}
      >
        <div className="p-5 flex-1">
          <h2 className="text-lg font-semibold mb-4">Lugares</h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl h-32 bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No se encontraron lugares
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {places.length} lugar{places.length !== 1 ? "es" : ""}{" "}
                encontrado{places.length !== 1 ? "s" : ""}
              </p>
              {places.map((place) => (
                <PlaceCard
                  key={place._id.toString()}
                  place={place}
                  onMapClick={(p) => setSelectedPlaceId(p._id.toString())}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">Cargando mapa...</div>
      }
    >
      <MapaContent />
    </Suspense>
  )
}
