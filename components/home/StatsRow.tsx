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
  label: string
  description: string
  note?: string
}> = [
  {
    key: "places",
    Icon: MapPin,
    label: "lugares",
    description: "lugares en el mapa",
  },
  {
    key: "reviews",
    Icon: MessageSquare,
    label: "reseñas",
    description: "reseñas en Google",
    note: "Acumuladas por los lugares disponibles en CeliMap",
  },
  {
    key: "users",
    Icon: Users,
    label: "usuarios",
    description: "usuarios registrados",
  },
]

function MetricNumber({ formatted, showPlus }: { formatted: string; showPlus: boolean }) {
  const isMillions = / M\+$/.test(formatted)
  const digits = isMillions
    ? formatted.replace(/ M\+$/, "")
    : formatted.replace(/\+$/, "")

  return (
    <span className="inline-flex items-baseline gap-0.5 leading-none text-olive">
      {showPlus ? (
        <span className="text-[1.35rem] font-semibold opacity-80 sm:text-[1.45rem]" aria-hidden>
          +
        </span>
      ) : null}
      <span className="text-[2.1rem] font-semibold tracking-tight tabular-nums sm:text-[2.35rem] md:text-[2.5rem]">
        {digits}
      </span>
      {isMillions ? (
        <span
          className="text-[1.15rem] font-semibold tracking-tight opacity-85 sm:text-[1.25rem]"
          aria-hidden
        >
          M
        </span>
      ) : null}
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
    if (seeded) return
    let cancelled = false
    fetchApi<StatsApi>("/api/stats")
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
      <h2 className="mb-6 text-center font-display text-xl font-bold text-olive md:mb-8 md:text-2xl">
        La comunidad que hace crecer el mapa
      </h2>
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-px rounded-[24px] bg-olive/10 opacity-70 blur-2xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-[24px] border border-olive/10 bg-card shadow-soft">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(45,74,52,0.08),transparent_52%)]"
          aria-hidden
        />
        <ul className="relative grid divide-y divide-olive/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {METRICS.map(({ key, Icon, label, description, note }) => {
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-olive/20 bg-olive/10 text-olive">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </div>

                <p className="mt-2 min-h-[2.4rem]" aria-label={ariaValue}>
                  {isLoading ? (
                    <span
                      className="inline-block h-9 w-20 animate-pulse rounded-md bg-olive/10"
                      aria-hidden
                    />
                  ) : floored ? (
                    <MetricNumber
                      formatted={floored.formatted}
                      showPlus={floored.showPlus}
                    />
                  ) : (
                    <span className="text-3xl font-semibold text-olive/30">—</span>
                  )}
                </p>

                <p className="mt-1.5 max-w-[15rem] text-[13px] font-medium leading-snug text-[#4D6554] sm:text-sm">
                  {label}
                </p>
                {note ? (
                  <p className="mt-1 max-w-[15.5rem] text-[11px] leading-snug text-muted-foreground/80 sm:text-xs">
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
      </div>
    </section>
  )
}
