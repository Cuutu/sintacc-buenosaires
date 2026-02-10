"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { FeaturedCard } from "./FeaturedCard"
import { FeaturedSkeleton } from "./FeaturedSkeleton"
import type { PlaceWithStats } from "./featured-utils"

const TARGET_COUNT = 3
const AUTOPLAY_DELAY = 3000

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

interface FeaturedCarouselProps {
  items: (PlaceWithStats | "skeleton")[]
  isLoading?: boolean
}

export function FeaturedCarousel({ items, isLoading }: FeaturedCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  React.useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  React.useEffect(() => {
    if (!api || prefersReducedMotion || isPaused) return
    const interval = setInterval(() => {
      api.scrollNext()
      if (api.canScrollNext() === false && api.canScrollPrev() === true) {
        api.scrollTo(0)
      }
    }, AUTOPLAY_DELAY)
    return () => clearInterval(interval)
  }, [api, prefersReducedMotion, isPaused])

  const resumeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
  }, [])
  const handlePointerDown = React.useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    resumeTimeoutRef.current = null
    setIsPaused(true)
  }, [])
  const handlePointerUp = React.useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 300)
  }, [])

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          skipSnaps: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {items.map((item, index) => (
            <CarouselItem
              key={item === "skeleton" ? `skeleton-${index}` : item._id.toString()}
              className="basis-full pl-2 md:basis-1/2 md:pl-4 lg:basis-1/3"
            >
              {item === "skeleton" ? (
                <FeaturedSkeleton />
              ) : (
                <FeaturedCard place={item} />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-1 md:left-0 md:-left-4 lg:-left-12" />
        <CarouselNext className="right-1 md:right-0 md:-right-4 lg:-right-12" />
      </Carousel>

      {count > 1 && (
        <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Indicadores del carrusel">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Ir al slide ${i + 1} de ${count}`}
              onClick={() => api?.scrollTo(i)}
              className={`
                h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${i === current
                  ? "w-8 bg-primary"
                  : "w-2 bg-white/30 hover:bg-white/50"
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  )
}
