"use client"

import Link from "next/link"
import { Star, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { IPlace } from "@/models/Place"
import { getSafetyBadge, inferSafetyLevel } from "@/components/featured/featured-utils"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"

interface PlaceMiniCardProps {
  place: IPlace & { stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number } }
  selected?: boolean
}

const TYPE_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  bakery: "🥐",
  store: "🛒",
  icecream: "🍦",
  bar: "🍺",
  other: "📍",
}

export function PlaceMiniCard({ place, selected }: PlaceMiniCardProps) {
  const primaryType = place.types?.[0] ?? place.type
  const typeIcon = TYPE_ICONS[primaryType] || "📍"
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const effectiveSafetyLevel = inferSafetyLevel(place)
  const safetyConfig = getSafetyBadge(effectiveSafetyLevel as any)

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-xl border transition-all min-h-[72px] touch-manipulation",
        "bg-black/40 backdrop-blur border-white/10",
        selected
          ? "border-primary/50 ring-2 ring-primary/30"
          : "hover:border-white/20"
      )}
    >
      {/* Foto */}
      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-white/5">
        {place.photos?.[0] ? (
          <img
            src={place.photos[0]}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {typeIcon}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm line-clamp-2">{place.name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{place.neighborhood}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {stats.totalReviews && stats.totalReviews > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {stats.avgRating?.toFixed(1)} ({stats.totalReviews})
            </span>
          )}
          {(stats.contaminationReportsCount ?? 0) > 0 && (
            <ContaminationRiskBadge count={stats.contaminationReportsCount ?? 0} variant="inline" />
          )}
          {safetyConfig && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${safetyConfig.className ?? "bg-muted/50 text-muted-foreground border-border"}`}
            >
              <span aria-hidden>{safetyConfig.dot}</span>
              {safetyConfig.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Link href={`/lugar/${place._id}`} className="block">
      {content}
    </Link>
  )
}
