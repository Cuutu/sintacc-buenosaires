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
      {/* Sidebar */}
      <div className="w-full md:w-96 border-r bg-background p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4">
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
          <div className="text-center py-8">Cargando...</div>
        ) : places.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron lugares
          </div>
        ) : (
          <div className="space-y-4">
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
