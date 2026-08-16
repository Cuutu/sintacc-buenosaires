"use client"

import type { ComponentType } from "react"
import { Coffee, MapPin, ShoppingBasket, Star, Store, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"
import { IPlace } from "@/models/Place"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { FavoriteButton } from "@/components/favorite-button"
import { TYPES } from "@/lib/constants"

interface PlaceMiniCardProps {
  place: IPlace & {
    stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
    googleSnapshot?: { rating?: number; userRatingCount?: number } | null
  }
  selected?: boolean
  onSelect?: () => void
}

const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  restaurant: Utensils,
  cafe: Coffee,
  bakery: Store,
  store: ShoppingBasket,
  icecream: Store,
  bar: Store,
  other: MapPin,
}

const SAFETY_BADGE: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  dedicated_gf: {
    label: "100% sin TACC",
    className: "bg-[#1F4D35]/10 text-[#1F4D35] border-[#1F4D35]/20",
    dot: "#1F4D35",
  },
  gf_options: {
    label: "Tiene opciones",
    className: "bg-[#C85A2E]/10 text-[#C85A2E] border-[#C85A2E]/25",
    dot: "#C85A2E",
  },
  unknown: {
    label: "Sin información",
    className: "bg-[#CFC9BF]/35 text-[#6B645C] border-[#CFC9BF]",
    dot: "#CFC9BF",
  },
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
)

export function PlaceMiniCard({ place, selected, onSelect }: PlaceMiniCardProps) {
  const primaryType = place.types?.[0] ?? place.type
  const TypeIcon = TYPE_ICONS[primaryType] || MapPin
  const typeLabel = TYPE_LABELS[primaryType] ?? primaryType
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const safetyLevel = inferSafetyLevel(place) ?? "unknown"
  const safetyBadge = SAFETY_BADGE[safetyLevel] ?? SAFETY_BADGE.unknown

  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount
  const hasCommunityReviews = (stats.totalReviews ?? 0) > 0
  const ratingLabel = hasCommunityReviews
    ? `${stats.avgRating?.toFixed(1)}`
    : googleRating != null
      ? `${googleRating.toFixed(1)}`
      : null
  const ratingCount = hasCommunityReviews
    ? stats.totalReviews
    : googleCount != null
      ? googleCount
      : null

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-[20px] border px-3 py-3 transition-all",
        selected
          ? "border-[#1F4D35]/30 bg-[#F8F5EF] shadow-[0_8px_20px_rgba(31,77,53,0.08)]"
          : "border-[#E8E1D6] bg-[#F8F5EF] hover:border-[#1F4D35]/20"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-pressed={selected}
        aria-label={`Seleccionar ${place.name}`}
      >
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F4D35]/[0.08] text-[#1F4D35]"
          aria-hidden
        >
          <TypeIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-tight text-[#1F4D35]">
            {place.name}
          </h3>
          <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#5F6B63]">
            {typeLabel}
            {place.neighborhood ? ` · ${place.neighborhood}` : ""}
          </p>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                safetyBadge.className
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: safetyBadge.dot }}
                aria-hidden
              />
              {safetyBadge.label}
            </span>
            {ratingLabel && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F4D35]">
                <Star className="h-3.5 w-3.5 fill-[#C85A2E] text-[#C85A2E]" aria-hidden />
                {ratingLabel}
                {ratingCount != null && (
                  <span className="font-medium text-[#5F6B63]">({ratingCount})</span>
                )}
              </span>
            )}
          </span>
        </span>
      </button>
      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <FavoriteButton placeId={place._id.toString()} />
      </div>
    </div>
  )
}
