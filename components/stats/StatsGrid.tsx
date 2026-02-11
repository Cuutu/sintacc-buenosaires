"use client"

import { useEffect, useState } from "react"
import { MapPin, Star, Users } from "lucide-react"
import { StatCard } from "./StatCard"
import {
  pluralizeLocales,
  pluralizeExperiences,
  pluralizeUsers,
  formatCount,
} from "./utils"
import { ScrollReveal } from "@/components/scroll-reveal"

export type Stats = {
  places: number | null
  reviews: number | null
  users: number | null
  updatedAt?: string | null
}

function mapApiResponse(data: Record<string, unknown>): Stats {
  return {
    places: typeof data.placesCount === "number" ? data.placesCount : null,
    reviews: typeof data.reviewsCount === "number" ? data.reviewsCount : null,
    users: typeof data.usersCount === "number" ? data.usersCount : null,
  }
}

export function StatsGrid() {
  const [stats, setStats] = useState<Stats>({
    places: null,
    reviews: null,
    users: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setStats(mapApiResponse(data))
      })
      .catch(() => {
        setStats({ places: null, reviews: null, users: null })
      })
      .finally(() => setIsLoading(false))
  }, [])

  const cards = [
    {
      icon: MapPin,
      title: "Lugares verificados",
      value: stats.places,
      valueLabel: stats.places != null ? pluralizeLocales(stats.places) : "",
      displayValue: stats.places != null ? stats.places.toLocaleString("es-AR") : undefined,
      subtext: "en CABA (Buenos Aires)",
      chips: ["Panaderías", "Restaurantes", "Cafés"],
    },
    {
      icon: Star,
      title: "Reseñas reales",
      value: stats.reviews,
      valueLabel: stats.reviews != null ? pluralizeExperiences(stats.reviews) : "",
      displayValue: stats.reviews != null ? stats.reviews.toLocaleString("es-AR") : undefined,
      subtext: "compartidas por la comunidad",
      chips: ["Seguridad", "Cocina separada", "Fotos"],
    },
    {
      icon: Users,
      title: "Comunidad activa",
      value: stats.users,
      valueLabel: stats.users != null ? pluralizeUsers(stats.users) : "",
      displayValue:
        stats.users != null ? formatCount(stats.users, true) : undefined,
      subtext: "celíacos ayudándose",
      chips: ["Favoritos", "Sugerencias"],
    },
  ]

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <ScrollReveal key={card.title} delay={i * 100}>
          <StatCard
            icon={card.icon}
            title={card.title}
            value={card.value}
            valueLabel={card.valueLabel}
            displayValue={card.displayValue}
            subtext={card.subtext}
            chips={card.chips}
            isLoading={isLoading}
          />
        </ScrollReveal>
      ))}
    </div>
  )
}
