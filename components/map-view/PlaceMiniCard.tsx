"use client"

import Image from "next/image"
import Link from "next/link"
import type { ComponentType } from "react"
import {
  Coffee,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Store,
  Utensils,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { IPlace } from "@/models/Place"
import { getSafetyBadge, inferSafetyLevel } from "@/components/featured/featured-utils"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"
import { FavoriteButton } from "@/components/favorite-button"
import { getTagBadgeConfig } from "@/lib/constants"
import { getPlacePath } from "@/lib/place-url"
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

const TYPE_COLORS: Record<string, string> = {
  restaurant: "#ea580c",
  cafe: "#78350f",
  bakery: "#ca8a04",
  store: "#16a34a",
  icecream: "#ec4899",
  bar: "#7c3aed",
  other: "#3b82f6",
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
)

const SECONDARY_TAG_IDS = ["cocina_separada", "certificado_sin_tacc", "delivery"] as const

export function PlaceMiniCard({ place, selected, onSelect }: PlaceMiniCardProps) {
  const primaryType = place.types?.[0] ?? place.type
  const TypeIcon = TYPE_ICONS[primaryType] || MapPin
  const typeColor = TYPE_COLORS[primaryType] ?? TYPE_COLORS.other
  const typeLabel = TYPE_LABELS[primaryType] ?? primaryType
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const effectiveSafetyLevel = inferSafetyLevel(place)
  const safetyConfig = getSafetyBadge(effectiveSafetyLevel as any)

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
  const ratingSource = hasCommunityReviews ? null : googleRating != null ? "Google" : null

  const secondaryTags = (place.tags ?? []).filter((t) =>
    (SECONDARY_TAG_IDS as readonly string[]).includes(t)
  )
  const visibleTags = secondaryTags.slice(0, 2)
  const extraTags = Math.max(0, secondaryTags.length - 2)

  return (
    <div
      className={cn(
        "group relative flex min-h-[124px] max-h-[150px] gap-3 rounded-2xl border p-3 transition-colors",
        "bg-[#0c100e] shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
        selected
          ? "border-primary/70 ring-1 ring-primary/30"
          : "border-white/10 hover:border-white/18 hover:bg-[#101612]"
      )}
    >
      {selected && (
        <span className="absolute left-0 top-4 h-14 w-1 rounded-r-full bg-primary" aria-hidden />
      )}

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl"
        aria-pressed={selected}
        aria-label={`Seleccionar ${place.name}`}
      >
        <div
          className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/8"
          style={
            !place.photos?.[0]
              ? {
                  background: `radial-gradient(circle at 30% 25%, ${typeColor}55, rgba(255,255,255,0.06) 55%, rgba(8,12,15,0.9))`,
                }
              : undefined
          }
        >
          {place.photos?.[0] ? (
            <Image
              src={place.photos[0]}
              alt=""
              fill
              className="object-cover"
              sizes="100px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ color: typeColor }}>
              <TypeIcon className="h-8 w-8" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">{place.name}</h3>
          </div>

          <p className="mt-1 truncate text-xs text-white/55">
            {typeLabel}
            {place.neighborhood ? ` · ${place.neighborhood}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {safetyConfig && effectiveSafetyLevel && effectiveSafetyLevel !== "unknown" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  safetyConfig.className ?? "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                <ShieldCheck className="h-3 w-3" aria-hidden />
                {effectiveSafetyLevel === "dedicated_gf"
                  ? "100% sin TACC"
                  : effectiveSafetyLevel === "gf_options"
                    ? "Tiene opciones"
                    : safetyConfig.label}
              </span>
            )}

            {ratingLabel && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-white/76">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {ratingLabel}
                {ratingCount != null && (
                  <span className="text-white/38">
                    ({ratingCount}
                    {ratingSource ? ` ${ratingSource}` : ""})
                  </span>
                )}
              </span>
            )}

            {(stats.contaminationReportsCount ?? 0) > 0 && (
              <ContaminationRiskBadge count={stats.contaminationReportsCount ?? 0} variant="inline" />
            )}
          </div>

          {(visibleTags.length > 0 || extraTags > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {visibleTags.map((tag) => {
                const cfg = getTagBadgeConfig(tag)
                return (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/55"
                  >
                    {cfg.label}
                  </span>
                )
              })}
              {extraTags > 0 && (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                  +{extraTags}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <FavoriteButton placeId={place._id.toString()} />
        </div>
        <Link
          href={getPlacePath(place)}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Ver lugar
        </Link>
      </div>
    </div>
  )
}
