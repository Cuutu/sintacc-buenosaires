"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { fetchApi } from "@/lib/fetchApi"
import { MAX_FEATURED_PLACES } from "@/lib/featured-places"
import { uniqueByBrand } from "@/lib/place-brand"
import type { PlaceWithStats } from "@/components/featured/featured-utils"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"
import { HomeFeaturedCard } from "@/components/home/HomeFeaturedCard"
import { FeaturedSkeleton } from "@/components/featured/FeaturedSkeleton"

const SHOW = 6

/** Solo 100% sin TACC y una sucursal por marca (el servidor ya lo hace; esto cubre el respaldo del cliente). */
const onlyDedicated = (list: PlaceWithStats[]) =>
  uniqueByBrand(list.filter((place) => inferSafetyLevel(place) === "dedicated_gf")).slice(0, SHOW)

const navBtn =
  "flex h-11 w-11 items-center justify-center rounded-full border border-[#E6DFD2] bg-white text-olive transition-colors hover:border-olive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30 disabled:cursor-default disabled:opacity-35 disabled:hover:border-[#E6DFD2]"

export function HomeFeatured({ places: placesProp }: { places?: PlaceWithStats[] }) {
  const [places, setPlaces] = useState<PlaceWithStats[] | null>(placesProp ?? null)
  const [isLoading, setIsLoading] = useState(placesProp === undefined)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

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
        const dedicated = onlyDedicated(featured.places ?? [])
        if (dedicated.length) {
          setPlaces(dedicated)
          return
        }
        const recent = await fetchApi<{ places: PlaceWithStats[] }>(
          `/api/places?tags=100_gf&limit=${SHOW * 3}`
        )
        if (!cancelled) setPlaces(onlyDedicated(recent.places ?? []))
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

  // Un punto por página (no por tarjeta) y en sincronía con el swipe: se recalcula al
  // cambiar de página y cuando Embla se reinicia (rotar el teléfono, cambiar el ancho).
  useEffect(() => {
    if (!api) return
    const sync = () => {
      setCount(api.scrollSnapList().length)
      setCurrent(api.selectedScrollSnap())
      setCanPrev(api.canScrollPrev())
      setCanNext(api.canScrollNext())
    }
    sync()
    api.on("select", sync)
    api.on("reInit", sync)
    return () => {
      api.off("select", sync)
      api.off("reInit", sync)
    }
  }, [api])

  const items: (PlaceWithStats | "skeleton")[] = isLoading
    ? Array.from({ length: SHOW }).map(() => "skeleton" as const)
    : (places ?? []).slice(0, SHOW)

  if (!isLoading && items.length === 0) return null

  return (
    <section id="lugares" aria-labelledby="featured-heading">
      <HomeSectionHeader
        id="featured-heading"
        kicker="100% sin TACC"
        title="Lugares destacados"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/mapa"
              className="inline-flex min-h-[44px] items-center px-1 text-sm font-extrabold text-olive underline decoration-olive/30 underline-offset-4 hover:text-[#B84420]"
            >
              Ver todos
            </Link>
            {count > 1 ? (
              <div className="hidden items-center gap-2 lg:flex">
                <button
                  type="button"
                  onClick={() => api?.scrollPrev()}
                  disabled={!canPrev}
                  aria-label="Lugares anteriores"
                  className={navBtn}
                >
                  <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => api?.scrollNext()}
                  disabled={!canNext}
                  aria-label="Más lugares"
                  className={navBtn}
                >
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="relative" data-overflow-allowed="featured-carousel">
        {/* Sin vuelta (la flecha izquierda arranca apagada) y de a una página: en compu se
            ven 3 tarjetas y hay 2 páginas, no 6 puntos. */}
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: false, slidesToScroll: "auto", containScroll: "trimSnaps" }}
          className="w-full"
        >
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
        </Carousel>
        {count > 1 ? (
          <div className="mt-3 flex justify-center lg:hidden" role="tablist" aria-label="Lugares destacados">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Página ${i + 1} de ${count}`}
                onClick={() => api?.scrollTo(i)}
                className="group flex h-8 min-w-6 items-center justify-center px-1 focus-visible:outline-none"
              >
                {/* El punto se ve chico, pero la zona de toque es de 32 px de alto. */}
                <span
                  aria-hidden
                  className={`block h-2 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-olive/40 ${
                    i === current ? "w-8 bg-olive" : "w-2 bg-olive/25 group-hover:bg-olive/40"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
