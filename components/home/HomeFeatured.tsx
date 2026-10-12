"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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

const SHOW = 6

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
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="font-serif text-lg font-medium italic text-[#B84420]">elegidos por la comunidad</p>
          <h2
            id="featured-heading"
            className="mt-0.5 text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] text-olive md:text-4xl"
          >
            Lugares destacados
          </h2>
        </div>
        <Link
          href="/mapa"
          aria-label="Ver todos los lugares"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E6DFD2] bg-white text-olive transition-colors hover:border-olive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
        >
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
        </Link>
      </div>

      <div className="relative" data-overflow-allowed="featured-carousel">
        <Carousel setApi={setApi} opts={{ align: "start", loop: items.length > 1 }} className="w-full">
          <CarouselContent className="-ml-4 items-stretch">
            {items.map((item, index) => (
              <CarouselItem
                key={item === "skeleton" ? `sk-${index}` : item._id.toString()}
                className="h-auto basis-[78%] pl-4 sm:basis-[46%] md:basis-1/2 lg:basis-1/3"
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
