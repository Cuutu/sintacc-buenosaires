"use client"

import { useEffect, useState } from "react"
import { fetchApi } from "@/lib/fetchApi"
import { floorDisplayCount, floorGoogleReviewsDisplay } from "@/lib/stats/floor-display-count"

type StatsApi = {
  placesCount?: number
  reviewsCount?: number
  reviewsCountGoogle?: number
  usersCount?: number
}

type Stats = {
  places: number | null
  reviews: number | null
  users: number | null
}

const METRICS: Array<{
  key: keyof Stats
  label: string
  description: string
}> = [
  { key: "places", label: "lugares", description: "lugares en el mapa" },
  { key: "reviews", label: "reseñas", description: "reseñas en Google" },
  { key: "users", label: "usuarios", description: "usuarios registrados" },
]

function mapApi(data: StatsApi): Stats {
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

function formatValue(key: keyof Stats, raw: number) {
  return key === "reviews" ? floorGoogleReviewsDisplay(raw) : floorDisplayCount(raw)
}

export function HeroMetrics({ initialStats = null }: { initialStats?: StatsApi | null }) {
  const seeded = initialStats ? mapApi(initialStats) : null
  const [stats, setStats] = useState<Stats>(seeded ?? { places: null, reviews: null, users: null })
  const [isLoading, setIsLoading] = useState(!seeded)

  useEffect(() => {
    if (seeded) return
    let cancelled = false
    fetchApi<StatsApi>("/api/stats")
      .then((data) => {
        if (!cancelled) {
          setStats(mapApi(data))
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ places: null, reviews: null, users: null })
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-testid="home-stats"
      data-overflow-allowed="stats-carousel"
      aria-label="Estadísticas de CeliMap"
      className="celimap-hero-metrics mx-auto w-full max-w-xl overflow-hidden rounded-[16px] border border-[#D9DED4]/80 bg-white/90 shadow-[0_8px_28px_-16px_rgba(45,74,52,0.12)]"
    >
      <ul className="grid grid-cols-3 items-stretch divide-x divide-[#D9DED4]/80">
        {METRICS.map(({ key, label, description }) => {
          const raw = stats[key]
          const floored = raw != null ? formatValue(key, raw) : null
          const text =
            floored == null
              ? isLoading
                ? `Cargando ${description}`
                : `Sin dato de ${description}`
              : `${floored.formatted} ${description}`

          return (
            <li
              key={key}
              className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 sm:px-5 sm:py-3.5"
            >
              {isLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-olive/10" aria-hidden />
              ) : floored ? (
                <>
                  <p className="text-sm font-extrabold tabular-nums text-[#2D4A34] sm:text-base" aria-label={text}>
                    {floored.showPlus ? <span aria-hidden>+</span> : null}
                    <span className="tabular-nums">
                      {/ M\+$/.test(floored.formatted)
                        ? floored.formatted.replace(/ M\+$/, "")
                        : floored.formatted.replace(/\+$/, "")}
                    </span>
                    {/ M\+$/.test(floored.formatted) ? <span aria-hidden> M</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#55635A]">{label}</p>
                </>
              ) : (
                <p className="text-sm text-olive/40">— {label}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
