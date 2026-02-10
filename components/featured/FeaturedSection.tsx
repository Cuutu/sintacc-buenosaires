"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturedCard } from "./FeaturedCard"
import { FeaturedSkeleton } from "./FeaturedSkeleton"
import type { PlaceWithStats } from "./featured-utils"

const TARGET_COUNT = 4

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
    fetch("/api/places?limit=4")
      .then((res) => res.json())
      .then((data) => setPlaces(data.places ?? []))
      .catch(() => setPlaces([]))
      .finally(() => setIsLoading(false))
  }, [placesProp])

  const displayPlaces = places ?? []
  const skeletonsNeeded = Math.max(0, TARGET_COUNT - displayPlaces.length)

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
        <Button
          asChild
          size="sm"
          className="w-fit shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Link href="/mapa" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Abrir mapa
          </Link>
        </Button>
      </div>

      {/* Desktop: grid 2x2 */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: TARGET_COUNT }).map((_, i) => (
            <FeaturedSkeleton key={`skeleton-${i}`} />
          ))
        ) : (
          <>
            {displayPlaces.map((place) => (
              <FeaturedCard key={place._id.toString()} place={place} />
            ))}
            {Array.from({ length: skeletonsNeeded }).map((_, i) => (
              <FeaturedSkeleton key={`skeleton-fill-${i}`} />
            ))}
          </>
        )}
      </div>

      {/* Mobile: horizontal scroll con snap */}
      <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-4 pb-2 min-w-0" style={{ width: "max-content" }}>
          {isLoading ? (
            Array.from({ length: TARGET_COUNT }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="w-[280px] shrink-0 snap-center"
              >
                <FeaturedSkeleton />
              </div>
            ))
          ) : (
            <>
              {displayPlaces.map((place) => (
                <div
                  key={place._id.toString()}
                  className="w-[280px] shrink-0 snap-center"
                >
                  <FeaturedCard place={place} />
                </div>
              ))}
              {Array.from({ length: skeletonsNeeded }).map((_, i) => (
                <div
                  key={`skeleton-fill-${i}`}
                  className="w-[280px] shrink-0 snap-center"
                >
                  <FeaturedSkeleton />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
