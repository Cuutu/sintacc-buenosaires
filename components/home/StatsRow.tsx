"use client"

import { useEffect, useState } from "react"
import { MapPin, Star, Users, LucideIcon } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import {
  pluralizeLocales,
  pluralizeExperiences,
  pluralizeUsers,
} from "@/components/stats/utils"
import { statsCarouselCardWidthCss } from "@/lib/overflow-audit"

export type Stats = {
  places: number | null
  reviews: number | null
  users: number | null
}

function mapApiResponse(data: Record<string, unknown>): Stats {
  return {
    places: typeof data.placesCount === "number" ? data.placesCount : null,
    reviews: typeof data.reviewsCount === "number" ? data.reviewsCount : null,
    users: typeof data.usersCount === "number" ? data.usersCount : null,
  }
}

const CARDS = [
  {
    icon: MapPin,
    title: "Lugares",
    valueKey: "places" as const,
    pluralize: pluralizeLocales,
    subtext: "verificados",
  },
  {
    icon: Star,
    title: "Reseñas",
    valueKey: "reviews" as const,
    pluralize: pluralizeExperiences,
    subtext: "de la comunidad",
  },
  {
    icon: Users,
    title: "Usuarios",
    valueKey: "users" as const,
    pluralize: pluralizeUsers,
    subtext: "activos",
  },
]

function StatCardContent({
  Icon,
  title,
  subtext,
  displayValue,
  valueLabel,
  isLoading,
}: {
  Icon: LucideIcon
  title: string
  subtext: string
  displayValue?: string
  valueLabel: string
  isLoading: boolean
}) {
  return (
    <article className="flex min-h-[120px] min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300">
      <header className="mb-3 flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-white/90">{title}</h3>
          <p className="truncate text-xs text-white/60">{subtext}</p>
        </div>
      </header>
      {isLoading ? (
        <div className="h-10 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="break-words text-xl font-semibold tabular-nums text-primary sm:text-2xl">
          {displayValue ?? "—"} {valueLabel}
        </p>
      )}
    </article>
  )
}

/**
 * Mobile: carrusel horizontal intencional (snap + peek).
 * Marcador data-overflow-allowed="stats-carousel" = overflow legítimo.
 * Desktop/tablet md+: grid 3 cols.
 */
export function StatsRow() {
  const [stats, setStats] = useState<Stats>({
    places: null,
    reviews: null,
    users: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const cardWidth = statsCarouselCardWidthCss()

  useEffect(() => {
    fetchApi<{ placesCount?: number; reviewsCount?: number; usersCount?: number }>(
      "/api/stats",
      { cache: "no-store" }
    )
      .then((data) => setStats(mapApiResponse(data)))
      .catch(() => setStats({ places: null, reviews: null, users: null }))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <>
      <div
        role="region"
        aria-label="Estadísticas de Celimap"
        data-overflow-allowed="stats-carousel"
        data-carousel="stats"
        className="scrollbar-hide max-w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:hidden"
        style={{ scrollPaddingInline: "1rem" }}
      >
        <div className="flex w-max gap-3 pb-2 pl-1 pr-4">
          {CARDS.map(({ icon: Icon, title, valueKey, pluralize, subtext }, index) => {
            const value = stats[valueKey]
            const displayValue =
              value != null ? value.toLocaleString("es-AR") : undefined
            const valueLabel = value != null ? pluralize(value) : ""
            const isLast = index === CARDS.length - 1
            return (
              <div
                key={valueKey}
                className="shrink-0 snap-start"
                style={{
                  width: cardWidth,
                  // Padding final extra: última tarjeta scrollea completa
                  marginRight: isLast ? "0.25rem" : undefined,
                }}
              >
                <StatCardContent
                  Icon={Icon}
                  title={title}
                  subtext={subtext}
                  displayValue={displayValue}
                  valueLabel={valueLabel}
                  isLoading={isLoading}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mx-auto hidden max-w-4xl md:grid md:grid-cols-3 md:gap-6">
        {CARDS.map(({ icon: Icon, title, valueKey, pluralize, subtext }) => {
          const value = stats[valueKey]
          const displayValue =
            value != null ? value.toLocaleString("es-AR") : undefined
          const valueLabel = value != null ? pluralize(value) : ""
          return (
            <div key={valueKey} className="min-w-0">
              <StatCardContent
                Icon={Icon}
                title={title}
                subtext={subtext}
                displayValue={displayValue}
                valueLabel={valueLabel}
                isLoading={isLoading}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
