"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Star, Sparkles, Navigation } from "lucide-react"
import { PlaceCard } from "@/components/place-card"
import { TYPES } from "@/lib/constants"
import { CategoryIcon } from "@/components/seo/CategoryIcon"
import { fetchApi } from "@/lib/fetchApi"
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

  const totalResults = [
    ...filteredNearby,
    ...filteredBestRated.filter((p) => !filteredNearby.some((n) => n._id.toString() === p._id.toString())),
    ...filteredNew.filter(
      (p) =>
        !filteredNearby.some((n) => n._id.toString() === p._id.toString()) &&
        !filteredBestRated.some((b) => b._id.toString() === p._id.toString())
    ),
  ]

  const chipClass = (active: boolean) =>
    `inline-flex h-10 shrink-0 snap-center items-center gap-1.5 rounded-full px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30 ${
      active
        ? "bg-[#2D4A34] text-[#F7F3EB]"
        : "border-[1.5px] border-[#DDD5C6] bg-white text-[#2D4A34] hover:border-[#2D4A34]/35"
    }`

  const renderGrid = (loading: boolean, list: PlaceWithStatsType[], empty: string) =>
    loading ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[248px] animate-pulse rounded-[26px] bg-[#EFE9DE]" />
        ))}
      </div>
    ) : list.length === 0 ? (
      <p className="py-4 text-[15px] text-[#5E6A60]">{empty}</p>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((place) => (
          <PlaceCard key={place._id.toString()} place={place} />
        ))}
      </div>
    )

  return (
    <div className="container mx-auto max-w-5xl px-4 pb-14 pt-8 md:px-5 md:pt-12">
      <p className="font-serif text-lg font-medium italic text-[#B84420] md:text-xl">para descubrir</p>
      <h1 className="mt-1 text-[34px] font-extrabold leading-[1.04] tracking-[-0.035em] text-olive md:text-[50px]">
        Explorar
      </h1>
      <p className="mt-3 text-[15px] font-semibold text-[#5E6A60]">
        {totalResults.length} lugar{totalResults.length !== 1 ? "es" : ""}
      </p>

      {/* Category chips */}
      <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:flex-wrap md:px-0">
        <button
          type="button"
          onClick={() => setSelectedType(null)}
          aria-pressed={!selectedType}
          className={chipClass(!selectedType)}
        >
          Todos
        </button>
        {TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setSelectedType(type.value)}
            aria-pressed={selectedType === type.value}
            className={chipClass(selectedType === type.value)}
          >
            <CategoryIcon category={type.value} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Cerca tuyo */}
      <section className="mt-10 border-t border-[#E2DACB] pt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.025em] text-olive">
            <Navigation className="h-5 w-5 text-[#B84420]" aria-hidden />
            Cerca tuyo
          </h2>
          <Link
            href="/mapa"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-olive underline decoration-olive/30 underline-offset-4 hover:text-[#B84420]"
          >
            Ver mapa
            <MapPin className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {renderGrid(nearbyLoading, filteredNearby, "Activá la ubicación para ver lugares cerca tuyo.")}
      </section>

      {/* Mejor valorados */}
      <section className="mt-10 border-t border-[#E2DACB] pt-8">
        <h2 className="mb-5 flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.025em] text-olive">
          <Star className="h-5 w-5 fill-[#B84420] text-[#B84420]" aria-hidden />
          Mejor valorados
        </h2>
        {renderGrid(bestRatedLoading, filteredBestRated, "Todavía no hay lugares con reseñas de la comunidad.")}
      </section>

      {/* Nuevos */}
      <section className="mt-10 border-t border-[#E2DACB] pt-8">
        <h2 className="mb-5 flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.025em] text-olive">
          <Sparkles className="h-5 w-5 text-[#B84420]" aria-hidden />
          Nuevos
        </h2>
        {renderGrid(newLoading, filteredNew, "No hay lugares en esta categoría.")}
      </section>
    </div>
  )
}
