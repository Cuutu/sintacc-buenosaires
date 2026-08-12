"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, MessageSquare, Users, type LucideIcon } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import { floorDisplayCount } from "@/lib/stats/floor-display-count"
import { usePrefersReducedMotion } from "@/components/map-view/usePrefersReducedMotion"

export type Stats = {
  places: number | null
  reviews: number | null
  users: number | null
}

type StatsApi = {
  placesCount?: number
  reviewsCount?: number
  usersCount?: number
}

function mapApiResponse(data: StatsApi): Stats {
  return {
    places: typeof data.placesCount === "number" ? data.placesCount : null,
    reviews: typeof data.reviewsCount === "number" ? data.reviewsCount : null,
    users: typeof data.usersCount === "number" ? data.usersCount : null,
  }
}

const METRICS: Array<{
  key: keyof Stats
  Icon: LucideIcon
  description: string
}> = [
  {
    key: "places",
    Icon: MapPin,
    description: "lugares en el mapa",
  },
  {
    key: "reviews",
    Icon: MessageSquare,
    description: "reseñas de CeliMap y Google",
  },
  {
    key: "users",
    Icon: Users,
    description: "usuarios en la comunidad",
  },
]

function MetricNumber({ formatted, showPlus }: { formatted: string; showPlus: boolean }) {
  if (!showPlus) {
    return (
      <span className="text-[2.25rem] font-semibold leading-none tracking-tight text-primary tabular-nums sm:text-[2.5rem] md:text-[2.75rem]">
        {formatted}
      </span>
    )
  }

  const digits = formatted.replace(/^\+/, "")
  return (
    <span className="inline-flex items-baseline gap-0.5 leading-none text-primary">
      <span className="text-[1.55rem] font-semibold opacity-80 sm:text-[1.7rem] md:text-[1.85rem]" aria-hidden>
        +
      </span>
      <span className="text-[2.25rem] font-semibold tracking-tight tabular-nums sm:text-[2.5rem] md:text-[2.75rem]">
        {digits}
      </span>
    </span>
  )
}

/**
 * Bloque premium de social proof (un contenedor, 3 métricas).
 * Mobile: filas + separadores horizontales.
 * Desktop: columnas + separadores verticales.
 */
export function StatsRow() {
  const [stats, setStats] = useState<Stats>({
    places: null,
    reviews: null,
    users: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    fetchApi<StatsApi>("/api/stats", { cache: "no-store" })
      .then((data) => setStats(mapApiResponse(data)))
      .catch(() => setStats({ places: null, reviews: null, users: null }))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }
    // Hero above-the-fold: reveal en el próximo frame (sin depender de IO).
    const id = window.requestAnimationFrame(() => setVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [prefersReducedMotion])

  return (
    <section
      ref={rootRef}
      data-testid="home-stats"
      aria-label="Estadísticas de CeliMap"
      className={`relative transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-primary/10 opacity-60 blur-xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1210]/90 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(74_222_128/0.08),transparent_55%)]"
          aria-hidden
        />
        <ul className="relative grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {METRICS.map(({ key, Icon, description }) => {
            const raw = stats[key]
            const floored = raw != null ? floorDisplayCount(raw) : null
            const ariaValue =
              floored != null
                ? `${floored.formatted} ${description}`
                : isLoading
                  ? `Cargando ${description}`
                  : `Sin dato de ${description}`

            return (
              <li
                key={key}
                className="flex min-w-0 flex-col items-center px-5 py-7 text-center sm:px-6 md:py-8"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </div>

                <p className="mt-3.5 min-h-[2.75rem]" aria-label={ariaValue}>
                  {isLoading ? (
                    <span
                      className="inline-block h-10 w-24 animate-pulse rounded-md bg-white/10"
                      aria-hidden
                    />
                  ) : floored ? (
                    <MetricNumber
                      formatted={floored.formatted}
                      showPlus={floored.showPlus}
                    />
                  ) : (
                    <span className="text-3xl font-semibold text-white/35">—</span>
                  )}
                </p>

                <p className="mt-2 max-w-[16rem] text-sm leading-snug text-white/60">
                  {description}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
