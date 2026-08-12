"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, MessageSquare, Users, type LucideIcon } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import { floorDisplayCount, floorGoogleReviewsDisplay } from "@/lib/stats/floor-display-count"
import { usePrefersReducedMotion } from "@/components/map-view/usePrefersReducedMotion"

export type Stats = {
  places: number | null
  /** Solo reseñas Google acumuladas (userRatingCount). */
  reviews: number | null
  users: number | null
}

type StatsApi = {
  placesCount?: number
  reviewsCount?: number
  reviewsCountGoogle?: number
  usersCount?: number
}

export type StatsRowProps = {
  /** Stats SSR: evita skeleton/`—` si /api/stats falla en client. */
  initialStats?: StatsApi | null
}

function mapApiResponse(data: StatsApi): Stats {
  const google =
    typeof data.reviewsCountGoogle === "number"
      ? data.reviewsCountGoogle
      : typeof data.reviewsCount === "number"
        ? data.reviewsCount
        : null
  return {
    places: typeof data.placesCount === "number" ? data.placesCount : null,
    reviews: google,
    users: typeof data.usersCount === "number" ? data.usersCount : null,
  }
}

const METRICS: Array<{
  key: keyof Stats
  Icon: LucideIcon
  description: string
  note?: string
}> = [
  {
    key: "places",
    Icon: MapPin,
    description: "lugares en el mapa",
  },
  {
    key: "reviews",
    Icon: MessageSquare,
    description: "reseñas en Google",
    note: "Acumuladas por los lugares disponibles en CeliMap",
  },
  {
    key: "users",
    Icon: Users,
    description: "usuarios registrados",
  },
]

function MetricNumber({ formatted, showPlus }: { formatted: string; showPlus: boolean }) {
  if (!showPlus) {
    return (
      <span className="text-[2.1rem] font-semibold leading-none tracking-tight text-primary tabular-nums sm:text-[2.35rem] md:text-[2.5rem]">
        {formatted}
      </span>
    )
  }

  const isMillions = / M\+$/.test(formatted)
  if (isMillions) {
    const core = formatted.replace(/ M\+$/, "")
    return (
      <span className="inline-flex items-baseline gap-1 leading-none text-primary">
        <span className="text-[2.1rem] font-semibold tracking-tight tabular-nums sm:text-[2.35rem] md:text-[2.5rem]">
          {core}
        </span>
        <span
          className="text-[1.15rem] font-semibold tracking-tight opacity-85 sm:text-[1.25rem]"
          aria-hidden
        >
          M+
        </span>
      </span>
    )
  }

  const digits = formatted.replace(/\+$/, "")
  return (
    <span className="inline-flex items-baseline gap-0.5 leading-none text-primary">
      <span className="text-[2.1rem] font-semibold tracking-tight tabular-nums sm:text-[2.35rem] md:text-[2.5rem]">
        {digits}
      </span>
      <span className="text-[1.35rem] font-semibold opacity-80 sm:text-[1.45rem]" aria-hidden>
        +
      </span>
    </span>
  )
}

/**
 * Bloque premium de social proof (un contenedor, 3 métricas).
 * Prefiere initialStats (SSR); client refetch es best-effort.
 */
export function StatsRow({ initialStats = null }: StatsRowProps) {
  const seeded = initialStats ? mapApiResponse(initialStats) : null
  const [stats, setStats] = useState<Stats>(
    seeded ?? { places: null, reviews: null, users: null }
  )
  const [isLoading, setIsLoading] = useState(!seeded)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    let cancelled = false
    fetchApi<StatsApi>("/api/stats", { cache: "no-store" })
      .then((data) => {
        if (!cancelled) {
          setStats(mapApiResponse(data))
          setIsLoading(false)
        }
      })
      .catch(() => {
        // Si ya hay SSR, no pisar con vacío.
        if (!cancelled && !seeded) {
          setStats({ places: null, reviews: null, users: null })
          setIsLoading(false)
        } else if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // Solo montaje: initialStats ya seedó el state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }
    const id = window.requestAnimationFrame(() => setVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [prefersReducedMotion])

  return (
    <section
      ref={rootRef}
      data-testid="home-stats"
      aria-label="Estadísticas de CeliMap"
      className={`relative transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl bg-primary/15 opacity-70 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1210]/90 shadow-[0_16px_44px_-26px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(74_222_128/0.12),transparent_52%)]"
          aria-hidden
        />
        <ul className="relative grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {METRICS.map(({ key, Icon, description, note }) => {
            const raw = stats[key]
            const floored =
              raw != null
                ? key === "reviews"
                  ? floorGoogleReviewsDisplay(raw)
                  : floorDisplayCount(raw)
                : null
            const ariaValue =
              floored != null
                ? `${floored.formatted} ${description}${note ? `. ${note}` : ""}`
                : isLoading
                  ? `Cargando ${description}`
                  : `Sin dato de ${description}`

            return (
              <li
                key={key}
                className="flex min-w-0 flex-col items-center px-4 py-5 text-center sm:px-5 md:py-6"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </div>

                <p className="mt-2 min-h-[2.4rem]" aria-label={ariaValue}>
                  {isLoading ? (
                    <span
                      className="inline-block h-9 w-20 animate-pulse rounded-md bg-white/10"
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

                <p className="mt-1.5 max-w-[15rem] text-[13px] font-medium leading-snug text-white/72 sm:text-sm">
                  {description}
                </p>
                {note ? (
                  <p className="mt-1 max-w-[15.5rem] text-[11px] leading-snug text-white/45 sm:text-xs">
                    {note}
                  </p>
                ) : (
                  <p className="mt-1 hidden min-h-[1.1rem] md:block" aria-hidden />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
