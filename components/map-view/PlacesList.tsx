"use client"

import * as React from "react"
import Link from "next/link"
import { PlaceMiniCard } from "./PlaceMiniCard"
import type { IPlace } from "@/models/Place"
import type { UserLatLng } from "./geo"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import { MOTION_MS } from "./motion"
import { cn } from "@/lib/utils"

interface PlacesListProps {
  places: (IPlace & { stats?: { avgRating?: number; totalReviews?: number } })[]
  selectedPlaceId: string | null
  loading?: boolean
  loadError?: string | null
  onRetryLoad?: () => void
  onPlaceSelect?: (place: IPlace) => void
  onPlaceHover?: (placeId: string | null) => void
  onClearFilters?: () => void
  userLocation?: UserLatLng | null
  locationCta?: string | null
  onRequestLocation?: () => void
  locationMessage?: string | null
}

/** Tarjetas que se dibujan de entrada; el resto se suma de a tanto al acercarse al final. */
const LIST_PAGE_SIZE = 30
/**
 * Se observan las últimas tarjetas dibujadas (no un sentinela de 1 px, que un scroll
 * rápido puede saltear): si se ve alguna, se suman las siguientes.
 */
const LIST_TAIL = 8

function PlaceCardSkeleton() {
  return (
      <div className="flex min-h-[72px] gap-3 rounded-[20px] border border-[#E8E1D6] bg-[#F8F5EF] p-3">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-[12px] bg-olive/5" />
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
  userLocation = null,
  locationCta,
  onRequestLocation,
  locationMessage,
}: PlacesListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const selectedRef = React.useRef<HTMLDivElement>(null)
  const reduceMotion = usePrefersReducedMotion()
  const validPlaces = React.useMemo(() => places.filter((place) => place?._id != null), [places])
  const listSignature = validPlaces.map((place) => String(place._id)).join(",")
  const prevSignatureRef = React.useRef(listSignature)
  const [enterNonce, setEnterNonce] = React.useState(0)
  const [leaving, setLeaving] = React.useState(false)
  const [renderLimit, setRenderLimit] = React.useState(LIST_PAGE_SIZE)
  if (prevSignatureRef.current !== listSignature) {
    prevSignatureRef.current = listSignature
    setEnterNonce((n) => n + 1)
    setRenderLimit(LIST_PAGE_SIZE)
    if (!reduceMotion) setLeaving(true)
  }
  // La tarjeta seleccionada siempre se dibuja (para poder llevarla a la vista).
  const selectedIndex = selectedPlaceId
    ? validPlaces.findIndex((place) => String(place._id) === selectedPlaceId)
    : -1
  const renderCount = Math.min(validPlaces.length, Math.max(renderLimit, selectedIndex + 1))
  React.useEffect(() => {
    if (renderCount >= validPlaces.length) return
    if (typeof IntersectionObserver === "undefined") {
      setRenderLimit(validPlaces.length)
      return
    }
    const tail = listRef.current?.querySelectorAll("[data-list-tail]")
    if (!tail?.length) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        setRenderLimit((limit) => Math.max(limit, renderCount) + LIST_PAGE_SIZE)
      }
    })
    tail.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [renderCount, validPlaces.length])

  React.useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => setLeaving(false), reduceMotion ? 0 : MOTION_MS.listOut)
    return () => window.clearTimeout(timer)
  }, [leaving, enterNonce, reduceMotion])

  // Callback estable: así las tarjetas (memo) no se vuelven a dibujar en cada render.
  const onPlaceSelectRef = React.useRef(onPlaceSelect)
  onPlaceSelectRef.current = onPlaceSelect
  const handlePlaceClick = React.useCallback((place: IPlace) => {
    // Un click selecciona + centra mapa; no navega al detalle
    onPlaceSelectRef.current?.(place)
  }, [])

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
      className={cn("space-y-2.5 px-3 pb-4 map-list-crossfade", leaving && "is-leaving")}
      onMouseLeave={() => onPlaceHover?.(null)}
    >
      {locationCta && onRequestLocation ? (
        <button
          type="button"
          onClick={onRequestLocation}
          className="w-full rounded-2xl border border-[#C85A2E]/20 bg-[#C85A2E]/8 px-3 py-2 text-left text-[12.5px] font-semibold text-[#C85A2E]"
        >
          {locationCta}
        </button>
      ) : null}
      {locationMessage ? (
        <p className="px-1 text-[12px] text-muted-foreground">{locationMessage}</p>
      ) : null}
      {validPlaces.slice(0, renderCount).map((place, index) => {
        const id = String(place._id)
        // Con key estable la entrada se ve al montar: las tarjetas que ya estaban no se
        // redibujan ni vuelven a animarse cuando llega otra página.
        const stagger = !reduceMotion && index < 8
        return (
          <div
            key={id}
            ref={selectedPlaceId === id ? selectedRef : null}
            onMouseEnter={() => onPlaceHover?.(id)}
            className={cn(stagger && "map-card-enter")}
            style={stagger ? { animationDelay: `${index * 30}ms` } : undefined}
            data-list-tail={index >= renderCount - LIST_TAIL ? "" : undefined}
          >
            <PlaceMiniCard
              place={place}
              selected={selectedPlaceId === id}
              onSelect={handlePlaceClick}
              userLocation={userLocation}
            />
          </div>
        )
      })}
    </div>
  )
}
