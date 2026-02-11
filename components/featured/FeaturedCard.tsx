"use client"

import Link from "next/link"
import { MapPin, Star } from "lucide-react"
import type { PlaceWithStats } from "./featured-utils"
import { getSafetyBadge, getDisplayTags } from "./featured-utils"
import { TagBadge } from "@/components/TagBadge"

interface FeaturedCardProps {
  place: PlaceWithStats
}

export function FeaturedCard({ place }: FeaturedCardProps) {
  const photo = place.photos?.[0]
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(place.safetyLevel)
  const displayTags = getDisplayTags(place)

  return (
    <Link
      href={`/lugar/${place._id}`}
      className="group block rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent" />
        )}
        {/* Safety badge - top left */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium border border-white/10">
            <span aria-hidden>{safetyDot}</span>
            {safetyLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {place.name}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="line-clamp-1">{place.neighborhood}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-3">
          {stats.totalReviews && stats.totalReviews > 0 ? (
            <>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-semibold text-sm">
                {stats.avgRating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({stats.totalReviews})
              </span>
            </>
          ) : (
            <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              Nuevo
            </span>
          )}
        </div>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {displayTags.map((tag) => (
              <TagBadge key={tag} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
