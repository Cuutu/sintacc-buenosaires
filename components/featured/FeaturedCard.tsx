"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Star } from "lucide-react"
import type { PlaceWithStats } from "./featured-utils"
import { getSafetyBadge, getDisplayTags } from "./featured-utils"
import { TagBadge } from "@/components/TagBadge"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"
import { GoogleRatingBadge } from "@/components/google-rating-badge"
import { GooglePlaceCover } from "./GooglePlaceCover"
import { getPlacePath } from "@/lib/place-url"
import {
  getGoogleMapsBrowserKey,
  isGooglePlacePhotosEnabled,
} from "@/lib/google-maps-browser"

interface FeaturedCardProps {
  place: PlaceWithStats
}

export function FeaturedCard({ place }: FeaturedCardProps) {
  const photo = place.photos?.[0]
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }
  const { label: safetyLabel, dot: safetyDot } = getSafetyBadge(place.safetyLevel)
  const displayTags = getDisplayTags(place)

  const googlePlaceId = place.googlePlaceId?.trim() || null
  const useGoogleCover =
    !photo &&
    Boolean(googlePlaceId) &&
    isGooglePlacePhotosEnabled() &&
    Boolean(getGoogleMapsBrowserKey())

  return (
    <Link
      href={getPlacePath(place)}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {photo ? (
          <Image
            src={photo}
            alt={place.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : useGoogleCover && googlePlaceId ? (
          <GooglePlaceCover placeId={googlePlaceId} />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent" />
        )}
        {/* Contamination risk - top right if exists */}
        {(place.stats?.contaminationReportsCount ?? 0) > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <ContaminationRiskBadge
              count={place.stats?.contaminationReportsCount ?? 0}
              variant="card"
            />
          </div>
        )}
        {/* Safety badge - top left */}
        <div className="absolute left-3 top-3 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <span aria-hidden>{safetyDot}</span>
            {safetyLabel}
          </span>
        </div>
        {useGoogleCover && (
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/70">
            Google
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
          {place.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="line-clamp-1">{place.neighborhood}</span>
        </div>

        {/* Rating — Celimap primero; Google solo fallback */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {stats.totalReviews && stats.totalReviews > 0 ? (
            <>
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">
                {stats.avgRating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({stats.totalReviews})
              </span>
            </>
          ) : place.googleSnapshot?.rating != null ? (
            <GoogleRatingBadge snapshot={place.googleSnapshot} />
          ) : (
            <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Nuevo
            </span>
          )}
        </div>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <TagBadge key={tag} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
