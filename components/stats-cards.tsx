"use client"

import { useEffect, useState } from "react"
import { MapPin, Star, Users } from "lucide-react"
import { ScrollReveal } from "./scroll-reveal"

export function StatsCards() {
  const [stats, setStats] = useState({
    placesCount: 0,
    reviewsCount: 0,
    usersCount: 0,
  })

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) =>
        setStats({
          placesCount: data.placesCount ?? 0,
          reviewsCount: data.reviewsCount ?? 0,
          usersCount: data.usersCount ?? 0,
        })
      )
      .catch(() => {})
  }, [])

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <ScrollReveal delay={0}>
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 hover:bg-card/80 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <MapPin className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Lugares verificados</h3>
          <p className="text-2xl font-bold text-primary mb-1">
            {stats.placesCount.toLocaleString("es-AR")} locales
          </p>
          <p className="text-sm text-muted-foreground">cargados en Argentina</p>
          <p className="text-sm text-muted-foreground mt-2">
            Panaderías · Restaurantes · Cafés
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 hover:bg-card/80 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Star className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Reseñas reales</h3>
          <p className="text-2xl font-bold text-primary mb-1">
            {stats.reviewsCount.toLocaleString("es-AR")} experiencias
          </p>
          <p className="text-sm text-muted-foreground">compartidas</p>
          <p className="text-sm text-muted-foreground mt-2">
            Seguridad · Cocina separada · Fotos
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 hover:bg-card/80 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Comunidad activa</h3>
          <p className="text-2xl font-bold text-primary mb-1">
            +{stats.usersCount.toLocaleString("es-AR")} usuarios
          </p>
          <p className="text-sm text-muted-foreground">celíacos ayudándose</p>
        </div>
      </ScrollReveal>
    </div>
  )
}
