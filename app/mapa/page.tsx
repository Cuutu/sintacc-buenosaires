"use client"

import { useEffect, useState, Suspense } from "react"
import { Map } from "@/components/map"
import { PlaceCard } from "@/components/place-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { IPlace } from "@/models/Place"
import { useSearchParams } from "next/navigation"
import { Search, Filter } from "lucide-react"

const NEIGHBORHOODS = [
  "Palermo",
  "Recoleta",
  "San Telmo",
  "Puerto Madero",
  "Belgrano",
  "Villa Crespo",
  "Caballito",
  "Almagro",
  "Villa Urquiza",
  "Colegiales",
]

const TYPES = [
  { value: "", label: "Todos" },
  { value: "restaurant", label: "Restaurante" },
  { value: "cafe", label: "Café" },
  { value: "bakery", label: "Panadería" },
  { value: "store", label: "Tienda" },
  { value: "icecream", label: "Heladería" },
  { value: "bar", label: "Bar" },
  { value: "other", label: "Otro" },
]

function MapaContent() {
  const searchParams = useSearchParams()
  const [places, setPlaces] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    type: "",
    neighborhood: "",
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchPlaces()
  }, [filters])

  const fetchPlaces = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append("search", filters.search)
      if (filters.type) params.append("type", filters.type)
      if (filters.neighborhood) params.append("neighborhood", filters.neighborhood)

      const res = await fetch(`/api/places?${params.toString()}`)
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar - Glassmorphism */}
      <div className="map-sidebar w-full md:w-[420px] md:min-w-[340px] p-5 overflow-y-auto md:rounded-r-2xl z-10">
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
                      {TYPES.map((type) => (
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
                      <SelectItem value="">Todos</SelectItem>
                      {NEIGHBORHOODS.map((hood) => (
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
              <PlaceCard key={place._id.toString()} place={place} />
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map places={places} />
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
