"use client"

import { useEffect, useState } from "react"
import { MapPin, Star, Users, LucideIcon } from "lucide-react"
import {
  pluralizeLocales,
  pluralizeExperiences,
  pluralizeUsers,
} from "@/components/stats/utils"

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
    <article
      className="min-h-[120px] flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 transition-all duration-300"
    >
      <header className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-medium text-white/90">{title}</h3>
          <p className="text-xs text-white/60">{subtext}</p>
        </div>
      </header>
      {isLoading ? (
        <div className="h-10 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums text-primary">
          {displayValue ?? "—"} {valueLabel}
        </p>
      )}
    </article>
  )
}

export function StatsRow() {
  const [stats, setStats] = useState<Stats>({
    places: null,
    reviews: null,
    users: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(mapApiResponse(data)))
      .catch(() => setStats({ places: null, reviews: null, users: null }))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <>
      {/* Mobile: horizontal scroll con snap */}
      <div className="md:hidden w-full overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-4 pb-2" style={{ width: "max-content" }}>
          {CARDS.map(({ icon: Icon, title, valueKey, pluralize, subtext }) => {
            const value = stats[valueKey]
            const displayValue =
              value != null ? value.toLocaleString("es-AR") : undefined
            const valueLabel = value != null ? pluralize(value) : ""
            return (
              <div
                key={valueKey}
                className="w-[min(calc(100vw-2rem),280px)] shrink-0 snap-center"
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
      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:max-w-4xl md:mx-auto">
        {CARDS.map(({ icon: Icon, title, valueKey, pluralize, subtext }) => {
          const value = stats[valueKey]
          const displayValue =
            value != null ? value.toLocaleString("es-AR") : undefined
          const valueLabel = value != null ? pluralize(value) : ""
          return (
            <div key={valueKey}>
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
