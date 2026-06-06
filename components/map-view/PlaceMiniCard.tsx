"use client"

import Image from "next/image"
import type { ComponentType } from "react"
import {
  ChevronRight,
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

interface PlaceMiniCardProps {
  place: IPlace & { stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number } }
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

export function PlaceMiniCard({ place, selected, onSelect }: PlaceMiniCardProps) {
  const primaryType = place.types?.[0] ?? place.type
  const TypeIcon = TYPE_ICONS[primaryType] || MapPin
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const effectiveSafetyLevel = inferSafetyLevel(place)
  const safetyConfig = getSafetyBadge(effectiveSafetyLevel as any)

  return (
    <button type="button" onClick={onSelect} className="block w-full text-left">
      <div
        className={cn(
          "group relative flex min-h-[86px] gap-3 rounded-2xl border p-3 transition-all touch-manipulation",
          "bg-[#090c0b]/86 backdrop-blur-xl",
          selected
            ? "border-primary/55 shadow-[0_0_0_1px_rgba(16,185,129,0.20),0_18px_44px_rgba(0,0,0,0.32)]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.045]"
        )}
      >
        {selected && (
          <span className="absolute left-0 top-4 h-12 w-1 rounded-r-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.75)]" />
        )}

        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/[0.055] ring-1 ring-white/8">
          {place.photos?.[0] ? (
            <Image
              src={place.photos[0]}
              alt={place.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <TypeIcon className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{place.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/52">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{place.neighborhood}</span>
              </div>
            </div>
            <ChevronRight
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 transition",
                selected ? "text-primary" : "text-white/28 group-hover:text-white/60"
              )}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {stats.totalReviews && stats.totalReviews > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-white/76">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {stats.avgRating?.toFixed(1)}
                <span className="text-white/38">({stats.totalReviews})</span>
              </span>
            ) : (
              <span className="text-xs text-white/38">Sin reseñas</span>
            )}

            {(stats.contaminationReportsCount ?? 0) > 0 && (
              <ContaminationRiskBadge count={stats.contaminationReportsCount ?? 0} variant="inline" />
            )}

            {safetyConfig && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  safetyConfig.className ?? "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                {safetyConfig.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
