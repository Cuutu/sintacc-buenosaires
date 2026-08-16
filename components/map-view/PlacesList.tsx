"use client"

import * as React from "react"
import Link from "next/link"
import { PlaceMiniCard } from "./PlaceMiniCard"
import type { IPlace } from "@/models/Place"

interface PlacesListProps {
  places: (IPlace & { stats?: { avgRating?: number; totalReviews?: number } })[]
  selectedPlaceId: string | null
  loading?: boolean
  loadError?: string | null
  onRetryLoad?: () => void
  onPlaceSelect?: (place: IPlace) => void
  onPlaceHover?: (placeId: string | null) => void
  onClearFilters?: () => void
}

function PlaceCardSkeleton() {
  return (
      <div className="flex min-h-[72px] gap-3 rounded-[20px] border border-[#E8E1D6] bg-[#F8F5EF] p-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-olive/5" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-olive/8" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-olive/5" />
        <div className="mt-1 flex gap-2">
          <div className="h-5 w-24 animate-pulse rounded-full bg-olive/5" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-olive/5" />
        </div>
      </div>
    </div>
  )
}

export function PlacesList({
  places,
  selectedPlaceId,
  loading = false,
  loadError = null,
  onRetryLoad,
  onPlaceSelect,
  onPlaceHover,
  onClearFilters,
}: PlacesListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const selectedRef = React.useRef<HTMLDivElement>(null)

  const handlePlaceClick = React.useCallback(
    (place: IPlace) => {
      // Un click selecciona + centra mapa; no navega al detalle
      onPlaceSelect?.(place)
    },
    [onPlaceSelect]
  )

  React.useEffect(() => {
    if (!selectedPlaceId || !selectedRef.current || !listRef.current) return
    selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedPlaceId])

  if (loading) {
    return (
      <div ref={listRef} className="space-y-2.5 px-4 pb-6" aria-busy="true" aria-label="Cargando lugares">
        {[1, 2, 3, 4].map((i) => (
          <PlaceCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="px-5 py-12 text-center" data-places-error="1">
        <p className="text-sm font-medium text-olive/80">No pudimos cargar los lugares</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadError}</p>
        {onRetryLoad && (
          <button
            type="button"
            onClick={onRetryLoad}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-medium text-olive/80">
          No encontramos lugares con estos filtros en esta zona.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-full border border-olive/15 bg-olive/5 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-olive/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Limpiar filtros
            </button>
          )}
          <Link
            href="/sugerir"
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Sugerir un lugar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="space-y-2.5 px-3 pb-4"
      onMouseLeave={() => onPlaceHover?.(null)}
    >
      {places
        .filter((place) => place?._id != null)
        .map((place) => {
          const id = String(place._id)
          return (
            <div
              key={id}
              ref={selectedPlaceId === id ? selectedRef : null}
              onMouseEnter={() => onPlaceHover?.(id)}
            >
              <PlaceMiniCard
                place={place}
                selected={selectedPlaceId === id}
                onSelect={() => handlePlaceClick(place)}
              />
            </div>
          )
        })}
    </div>
  )
}
