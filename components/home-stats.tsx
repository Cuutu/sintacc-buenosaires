"use client"

import { useEffect, useState } from "react"
import { MapPin, MessageSquare } from "lucide-react"

export function HomeStats() {
  const [stats, setStats] = useState({ placesCount: 0, reviewsCount: 0 })

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-wrap justify-center gap-8 mt-8">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 border border-border/50">
        <MapPin className="h-5 w-5 text-primary" />
        <span className="text-muted-foreground">
          <strong className="text-foreground font-semibold">{stats.placesCount}</strong> lugares
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 border border-border/50">
        <MessageSquare className="h-5 w-5 text-primary" />
        <span className="text-muted-foreground">
          <strong className="text-foreground font-semibold">{stats.reviewsCount}</strong> reseñas
        </span>
      </div>
    </div>
  )
}
