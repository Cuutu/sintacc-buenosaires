"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { Map } from "@/components/map"
import { PlaceCard } from "@/components/place-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { IPlace } from "@/models/Place"
import { useSearchParams } from "next/navigation"
import { Search, Filter, List } from "lucide-react"
import { NEIGHBORHOODS, TYPES } from "@/lib/constants"

const TYPES_WITH_ALL = [{ value: "all", label: "Todos" }, ...TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` }))]

function MapaContent() {
  const searchParams = useSearchParams()
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [showSidebarMobile, setShowSidebarMobile] = useState(false)
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

  useEffect(() => {
    fetchPlaces()
  }, [debouncedSearch, filters.type, filters.neighborhood])

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (filters.type && filters.type !== "all") params.append("type", filters.type)
      if (filters.neighborhood && filters.neighborhood !== "all") params.append("neighborhood", filters.neighborhood)

      const res = await fetch(`/api/places?${params.toString()}`)
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filters.type, filters.neighborhood])

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] relative">
      {/* Botón mobile para abrir sidebar */}
      <Button
        className="md:hidden fixed bottom-4 left-4 z-20 rounded-full shadow-lg"
        size="icon"
        onClick={() => setShowSidebarMobile(true)}
      >
        <List className="h-5 w-5" />
      </Button>

      {/* Sidebar - Glassmorphism */}
      <div
        className={`map-sidebar w-full md:w-[420px] md:min-w-[340px] p-5 overflow-y-auto md:rounded-r-2xl z-10 
          md:relative fixed inset-y-0 left-0 h-full transition-transform duration-300
          ${showSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {showSidebarMobile && (
          <Button
            variant="ghost"
            className="absolute top-2 right-2 md:hidden"
            onClick={() => setShowSidebarMobile(false)}
          >
            ✕
          </Button>
        )}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Explorar lugares
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre, barrio..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/20 bg-white/90"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 w-11 rounded-xl shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4 rounded-xl border-2 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters({ ...filters, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_WITH_ALL.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Barrio</label>
                  <Select
                    value={filters.neighborhood}
                    onValueChange={(value) =>
                      setFilters({ ...filters, neighborhood: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {NEIGHBORHOODS.filter((h) => h !== "Otro").map((hood) => (
                        <SelectItem key={hood} value={hood}>
                          {hood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-32 bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No se encontraron lugares</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Probá con otros filtros o barrios</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {places.length} lugar{places.length !== 1 ? "es" : ""} encontrado{places.length !== 1 ? "s" : ""}
            </p>
            {places.map((place) => (
              <PlaceCard
                key={place._id.toString()}
                place={place}
                onMapClick={(p) => {
                  setSelectedPlaceId(p._id.toString())
                  setShowSidebarMobile(false)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          places={places}
          selectedPlaceId={selectedPlaceId || undefined}
          onPlaceSelect={(p) => setSelectedPlaceId(p._id.toString())}
        />
      </div>
    </div>
  )
}

export default function MapaPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Cargando...</div>}>
      <MapaContent />
    </Suspense>
  )
}
