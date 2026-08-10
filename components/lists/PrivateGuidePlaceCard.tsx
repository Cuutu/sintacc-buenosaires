"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, Navigation, Star, UtensilsCrossed } from "lucide-react"
import { IPlace } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import { TYPES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  getSafetyBadge,
  inferSafetyLevel,
} from "@/components/featured/featured-utils"

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
)

function mapsUrlForPlace(place: IPlace): string {
  const lat = place.location?.lat
  const lng = place.location?.lng
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  if (place.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
}

interface PrivateGuidePlaceCardProps {
  place: IPlace & {
    stats?: {
      avgRating?: number
      totalReviews?: number
    }
  }
  order: number
  note?: string
  creatorName: string
  creatorImage?: string
  selected?: boolean
  onFocusOnMap?: () => void
}

export function PrivateGuidePlaceCard({
  place,
  order,
  note,
  creatorName,
  creatorImage,
  selected,
  onFocusOnMap,
}: PrivateGuidePlaceCardProps) {
  const photo = place.photos?.[0]
  const primaryType = place.types?.[0] ?? place.type
  const typeLabel = TYPE_LABELS[primaryType]
  const safetyLevel = inferSafetyLevel(place)
  const safety = safetyLevel ? getSafetyBadge(safetyLevel) : null
  const detailHref = getPlacePath(place)

  const hasCelimapRating =
    place.stats?.totalReviews != null && place.stats.totalReviews > 0
  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount

  return (
    <article
      id={`guide-place-${place._id}`}
      className={cn(
        "overflow-hidden rounded-2xl border bg-[#0c100e]",
        selected
          ? "border-primary/50 ring-2 ring-primary/30"
          : "border-white/10"
      )}
    >
      <div className="relative aspect-[16/9] max-h-[180px] w-full overflow-hidden bg-[#0a0f0c]">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 420px"
          />
        ) : (
          <div className="flex h-full min-h-[120px] items-center gap-3 bg-gradient-to-br from-emerald-950/80 to-[#0a0f0c] px-4">
            <UtensilsCrossed className="h-7 w-7 shrink-0 text-primary/50" />
            <span className="line-clamp-2 text-sm font-semibold text-white/70">
              {place.name}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/65 px-2 text-xs font-bold text-white backdrop-blur-sm">
          {order}
        </span>
        {typeLabel ? (
          <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-[#0a0e12]/88 px-2 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            {typeLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 p-3.5">
        <div>
          <h3 className="text-[15px] font-bold leading-snug text-white">
            {place.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="truncate">
              {place.neighborhood || place.address || "Ubicación no disponible"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {hasCelimapRating ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-white">
                {place.stats?.avgRating?.toFixed(1)}
              </span>
              <span className="text-white/55">({place.stats?.totalReviews})</span>
            </span>
          ) : googleRating != null && Number.isFinite(googleRating) ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-white">
                {googleRating.toFixed(1)}
              </span>
              {googleCount != null && googleCount > 0 ? (
                <span className="text-white/55">
                  ({googleCount.toLocaleString("es-AR")})
                </span>
              ) : null}
              <span className="text-[10px] font-semibold uppercase text-white/45">
                Google
              </span>
            </span>
          ) : null}

          {safety && safetyLevel && safetyLevel !== "unknown" ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                safety.className
              )}
            >
              {safety.label}
            </span>
          ) : null}
        </div>

        {note ? (
          <blockquote className="rounded-xl border border-primary/20 bg-primary/[0.08] px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              {creatorImage ? (
                <Image
                  src={creatorImage}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {(creatorName[0] || "?").toUpperCase()}
                </span>
              )}
              <p className="text-[11px] font-semibold text-primary">
                Consejo de {creatorName}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/90">{note}</p>
          </blockquote>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <a
            href={mapsUrlForPlace(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden />
            Cómo llegar
          </a>
          <Link
            href={detailHref}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-2 text-xs font-semibold text-white/85 transition hover:bg-white/[0.07]"
          >
            Ver información
          </Link>
        </div>

        {onFocusOnMap ? (
          <button
            type="button"
            onClick={onFocusOnMap}
            className="w-full text-center text-[11px] font-medium text-primary/90 underline-offset-2 hover:underline"
          >
            Ver en el mapa de la guía
          </button>
        ) : null}
      </div>
    </article>
  )
}
