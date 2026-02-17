"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturedCarousel } from "./FeaturedCarousel"
import type { PlaceWithStats } from "./featured-utils"
import { fetchApi } from "@/lib/fetchApi"

const TARGET_COUNT = 3
const FETCH_LIMIT = 12

interface FeaturedSectionProps {
  /** Si se pasa, se usan estos lugares. Si no, se fetchean. */
  places?: PlaceWithStats[] | null
}

export function FeaturedSection({ places: placesProp }: FeaturedSectionProps) {
  const [places, setPlaces] = useState<PlaceWithStats[] | null>(
    placesProp ?? null
  )
  const [isLoading, setIsLoading] = useState(!placesProp)

  useEffect(() => {
    if (placesProp !== undefined) {
      setPlaces(placesProp)
      setIsLoading(false)
      return
    }
    fetchApi<{ places: PlaceWithStats[] }>(`/api/places?limit=${FETCH_LIMIT}`)
      .then((data) => setPlaces(data.places ?? []))
      .catch(() => setPlaces([]))
      .finally(() => setIsLoading(false))
  }, [placesProp])

  const displayPlaces = places ?? []
  const skeletonsNeeded = Math.max(0, TARGET_COUNT - displayPlaces.length)
  const items: (PlaceWithStats | "skeleton")[] = isLoading
    ? Array.from({ length: TARGET_COUNT }).fill("skeleton") as "skeleton"[]
    : [
        ...displayPlaces,
        ...Array.from({ length: skeletonsNeeded }).fill("skeleton") as "skeleton"[],
      ]

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Lugares destacados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recomendados por la comunidad celíaca
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            asChild
            size="sm"
            className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/mapa" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Abrir mapa
            </Link>
          </Button>
          <Link
            href="/mapa"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <FeaturedCarousel items={items} isLoading={isLoading} />
    </section>
  )
}
