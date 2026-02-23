"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Star, Sparkles, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturedCard } from "@/components/featured/FeaturedCard"
import { TYPES } from "@/lib/constants"
import { fetchApi } from "@/lib/fetchApi"
import type { PlaceWithStats } from "@/components/featured/featured-utils"
import type { IPlace } from "@/models/Place"

type PlaceWithStatsType = IPlace & {
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
}

export default function ExplorarPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [nearby, setNearby] = useState<PlaceWithStatsType[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [bestRated, setBestRated] = useState<PlaceWithStatsType[]>([])
  const [bestRatedLoading, setBestRatedLoading] = useState(true)
  const [newPlaces, setNewPlaces] = useState<PlaceWithStatsType[]>([])
  const [newLoading, setNewLoading] = useState(true)

  useEffect(() => {
    const fetchBestRated = async () => {
      try {
        const data = await fetchApi<{ places: PlaceWithStatsType[] }>(
          "/api/places?limit=50"
        )
        const withRating = (data.places || []).filter(
          (p) => (p.stats?.avgRating ?? 0) > 0 && (p.stats?.totalReviews ?? 0) > 0
        )
        withRating.sort(
          (a, b) => (b.stats?.avgRating ?? 0) - (a.stats?.avgRating ?? 0)
        )
        setBestRated(withRating.slice(0, 8))
      } catch {
        setBestRated([])
      } finally {
        setBestRatedLoading(false)
      }
    }
    fetchBestRated()
  }, [])

  useEffect(() => {
    const fetchNew = async () => {
      try {
        const data = await fetchApi<{ places: PlaceWithStatsType[] }>(
          "/api/places?limit=12"
        )
        setNewPlaces(data.places || [])
      } catch {
        setNewPlaces([])
      } finally {
        setNewLoading(false)
      }
    }
    fetchNew()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const data = await fetchApi<{ places: PlaceWithStatsType[] }>(
            `/api/places/near?lat=${latitude}&lng=${longitude}&radius=3000`
          )
          setNearby((data.places || []).slice(0, 8))
        } catch {
          setNearby([])
        } finally {
          setNearbyLoading(false)
        }
      },
      () => {
        setNearbyLoading(false)
      }
    )
  }, [])

  const filteredNew = selectedType
    ? newPlaces.filter((p) => p.type === selectedType || p.types?.includes(selectedType))
    : newPlaces
  const filteredBestRated = selectedType
    ? bestRated.filter((p) => p.type === selectedType || p.types?.includes(selectedType))
    : bestRated
  const filteredNearby = selectedType
    ? nearby.filter((p) => p.type === selectedType || p.types?.includes(selectedType))
    : nearby

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Explorar</h1>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        <button
          type="button"
          onClick={() => setSelectedType(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 snap-center transition-colors ${
            !selectedType
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos
        </button>
        {TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setSelectedType(type.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 snap-center transition-colors flex items-center gap-1.5 ${
              selectedType === type.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{type.emoji}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Cerca tuyo */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Cerca tuyo
          </h2>
          <Link href="/mapa">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver mapa
              <MapPin className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {nearbyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredNearby.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Activa la ubicación para ver lugares cerca tuyo
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredNearby.map((place) => (
              <FeaturedCard key={place._id.toString()} place={place as PlaceWithStats} />
            ))}
          </div>
        )}
      </section>

      {/* Mejor valorados */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          Mejor valorados
        </h2>
        {bestRatedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredBestRated.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Aún no hay lugares con reseñas
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredBestRated.map((place) => (
              <FeaturedCard key={place._id.toString()} place={place as PlaceWithStats} />
            ))}
          </div>
        )}
      </section>

      {/* Nuevos */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          Nuevos
        </h2>
        {newLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredNew.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay lugares en esta categoría
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredNew.map((place) => (
              <FeaturedCard key={place._id.toString()} place={place as PlaceWithStats} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
