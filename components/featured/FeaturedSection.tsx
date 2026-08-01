"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturedCarousel } from "./FeaturedCarousel"
import type { PlaceWithStats } from "./featured-utils"
import { fetchApi } from "@/lib/fetchApi"
import { MAX_FEATURED_PLACES } from "@/lib/featured-places"

const SKELETON_COUNT = 3
const FALLBACK_LIMIT = MAX_FEATURED_PLACES

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

    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        // Todos los destacados admin (hasta MAX), ordenados
        const featured = await fetchApi<{ places: PlaceWithStats[] }>(
          `/api/places?featured=true&limit=${MAX_FEATURED_PLACES}`
        )
        if (cancelled) return
        if (featured.places?.length) {
          setPlaces(featured.places)
          return
        }
        const recent = await fetchApi<{ places: PlaceWithStats[] }>(
          `/api/places?limit=${FALLBACK_LIMIT}`
        )
        if (!cancelled) setPlaces(recent.places ?? [])
      } catch {
        if (!cancelled) setPlaces([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [placesProp])

  const displayPlaces = (places ?? []).slice(0, MAX_FEATURED_PLACES)
  const items: (PlaceWithStats | "skeleton")[] = isLoading
    ? (Array.from({ length: SKELETON_COUNT }).fill("skeleton") as "skeleton"[])
    : displayPlaces

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">Lugares destacados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recomendados por la comunidad celíaca
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            asChild
            size="sm"
            className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/mapa" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Abrir mapa
            </Link>
          </Button>
          <Link
            href="/mapa"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
      </div>

      <FeaturedCarousel items={items} isLoading={isLoading} />
    </section>
  )
}
