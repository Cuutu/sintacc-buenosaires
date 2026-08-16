"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { fetchApi } from "@/lib/fetchApi"
import { MAX_FEATURED_PLACES } from "@/lib/featured-places"
import type { PlaceWithStats } from "@/components/featured/featured-utils"
import { HomeFeaturedCard } from "@/components/home/HomeFeaturedCard"
import { FeaturedSkeleton } from "@/components/featured/FeaturedSkeleton"

const SHOW = 3

export function HomeFeatured({ places: placesProp }: { places?: PlaceWithStats[] }) {
  const [places, setPlaces] = useState<PlaceWithStats[] | null>(placesProp ?? null)
  const [isLoading, setIsLoading] = useState(placesProp === undefined)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (placesProp !== undefined) {
      setPlaces(placesProp)
      setIsLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const featured = await fetchApi<{ places: PlaceWithStats[] }>(
          `/api/places?featured=true&limit=${MAX_FEATURED_PLACES}`
        )
        if (cancelled) return
        if (featured.places?.length) {
          setPlaces(featured.places.slice(0, SHOW))
          return
        }
        const recent = await fetchApi<{ places: PlaceWithStats[] }>(
          `/api/places?limit=${SHOW}`
        )
        if (!cancelled) setPlaces((recent.places ?? []).slice(0, SHOW))
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

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  const items: (PlaceWithStats | "skeleton")[] = isLoading
    ? Array.from({ length: SHOW }).map(() => "skeleton" as const)
    : (places ?? []).slice(0, SHOW)

  if (!isLoading && items.length === 0) return null

  return (
    <section id="lugares" aria-labelledby="featured-heading">
      <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <h2 id="featured-heading" className="font-display text-2xl font-bold text-olive md:text-3xl">
            Lugares destacados
          </h2>
          <p className="mt-1 text-sm text-[#4D6554]">Recomendados por la comunidad celíaca</p>
        </div>
        <Link href="/mapa" className="shrink-0 text-sm font-semibold text-olive hover:text-terracotta">
          Ver todos
        </Link>
      </div>

      <div className="relative" data-overflow-allowed="featured-carousel">
        <Carousel setApi={setApi} opts={{ align: "start", loop: items.length > 1 }} className="w-full">
          <CarouselContent className="-ml-4 items-stretch">
            {items.map((item, index) => (
              <CarouselItem
                key={item === "skeleton" ? `sk-${index}` : item._id.toString()}
                className="h-auto basis-full pl-4 md:basis-1/2 lg:basis-1/3"
              >
                {item === "skeleton" ? <FeaturedSkeleton /> : <HomeFeaturedCard place={item} />}
              </CarouselItem>
            ))}
          </CarouselContent>
          {items.length > 1 ? (
            <>
              <CarouselPrevious className="hidden lg:flex lg:-left-12" />
              <CarouselNext className="hidden lg:flex lg:-right-12" />
            </>
          ) : null}
        </Carousel>
        {count > 1 ? (
          <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Lugares destacados">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Lugar ${i + 1} de ${count}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-olive" : "w-2 bg-olive/25 hover:bg-olive/40"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
