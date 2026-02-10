"use client"

import * as React from "react"
import { PlaceMiniCard } from "./PlaceMiniCard"
import type { IPlace } from "@/models/Place"

interface PlacesListProps {
  places: (IPlace & { stats?: { avgRating?: number; totalReviews?: number } })[]
  selectedPlaceId: string | null
  loading?: boolean
}

export function PlacesList({
  places,
  selectedPlaceId,
  loading = false,
}: PlacesListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const selectedRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!selectedPlaceId || !selectedRef.current || !listRef.current) return
    selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedPlaceId])

  if (loading) {
    return (
      <div ref={listRef} className="px-4 pb-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-white/5 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        No se encontraron lugares
      </div>
    )
  }

  return (
    <div ref={listRef} className="px-4 pb-4 space-y-3">
      {places.map((place) => (
        <div
          key={place._id.toString()}
          ref={selectedPlaceId === place._id.toString() ? selectedRef : null}
        >
          <PlaceMiniCard
            place={place}
            selected={selectedPlaceId === place._id.toString()}
          />
        </div>
      ))}
    </div>
  )
}
