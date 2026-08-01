"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { MapPin, Star } from "lucide-react"
import type { PlaceWithStats } from "./featured-utils"
import {
  getFeaturedSecondaryTags,
  getSafetyBadge,
  getSafetyDataConflict,
  resolvePrimarySafety,
} from "./featured-utils"
import { TagBadge } from "@/components/TagBadge"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"
import { GoogleRatingBadge } from "@/components/google-rating-badge"
import { GooglePlaceCover } from "./GooglePlaceCover"
import { getPlacePath } from "@/lib/place-url"
import {
  getGoogleMapsBrowserKey,
  isGooglePlacePhotosEnabled,
} from "@/lib/google-maps-browser"
import { cn } from "@/lib/utils"

interface FeaturedCardProps {
  place: PlaceWithStats
}

export function FeaturedCard({ place }: FeaturedCardProps) {
  const photo = place.photos?.[0]
  const stats = place.stats ?? { avgRating: 0, totalReviews: 0 }

  const primarySafety = resolvePrimarySafety(place)
  const safetyBadge = getSafetyBadge(primarySafety)

  const googlePlaceId = place.googlePlaceId?.trim() || null
  const canUseGoogle =
    !photo &&
    Boolean(googlePlaceId) &&
    isGooglePlacePhotosEnabled() &&
    Boolean(getGoogleMapsBrowserKey())

  const [googleStatus, setGoogleStatus] = useState<"loading" | "ready" | "error" | null>(
    canUseGoogle ? "loading" : null
  )

  const useGoogleCover = canUseGoogle && googleStatus !== "error"
  const hideNativeTitle = useGoogleCover && googleStatus === "ready"

  const hasCelimapRating = Boolean(stats.totalReviews && stats.totalReviews > 0)
  const hasGoogleRating = place.googleSnapshot?.rating != null
  const includeNuevo = !hasCelimapRating && !hasGoogleRating

  const { chips: secondaryChips, extraCount } = getFeaturedSecondaryTags(place, {
    includeNuevo,
  })

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const conflict = getSafetyDataConflict(place)
    if (conflict) console.warn("[FeaturedCard] conflicto TACC:", conflict)
  }, [place])

  return (
    <Link
      href={getPlacePath(place)}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]",
        "hover:shadow-lg hover:shadow-black/20"
      )}
    >
      {photo ? (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
          <Image
            src={photo}
            alt={place.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <MediaOverlays
            place={place}
            safetyLabel={safetyBadge.label}
            safetyDot={safetyBadge.dot}
          />
        </div>
      ) : useGoogleCover && googlePlaceId ? (
        <div className="relative w-full shrink-0">
          <GooglePlaceCover placeId={googlePlaceId} onStatusChange={setGoogleStatus} />
          <MediaOverlays
            place={place}
            safetyLabel={safetyBadge.label}
            safetyDot={safetyBadge.dot}
            showGoogleHint={googleStatus === "ready"}
          />
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent" />
          <MediaOverlays
            place={place}
            safetyLabel={safetyBadge.label}
            safetyDot={safetyBadge.dot}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4 pt-3">
        {!hideNativeTitle && (
          <h3 className="mb-1 line-clamp-2 min-h-[2.75rem] text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {place.name}
          </h3>
        )}

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
          <span className="line-clamp-1">{place.neighborhood}</span>
        </div>

        <div className="mt-3 flex min-h-[1.25rem] flex-wrap items-center gap-1.5">
          {hasCelimapRating ? (
            <>
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-sm font-semibold">
                {stats.avgRating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">({stats.totalReviews})</span>
            </>
          ) : hasGoogleRating ? (
            <GoogleRatingBadge snapshot={place.googleSnapshot} />
          ) : null}
        </div>

        <div className="mt-auto flex min-h-[2.5rem] flex-wrap content-start items-start gap-2 pt-3">
          {secondaryChips.map((chip) =>
            chip.kind === "nuevo" ? (
              <span
                key="nuevo"
                className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                Nuevo
              </span>
            ) : (
              <TagBadge key={chip.tag} tag={chip.tag} size="sm" />
            )
          )}
          {extraCount > 0 && (
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/65">
              +{extraCount} más
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function MediaOverlays({
  place,
  safetyLabel,
  safetyDot,
  showGoogleHint,
}: {
  place: PlaceWithStats
  safetyLabel: string
  safetyDot: string
  showGoogleHint?: boolean
}) {
  return (
    <>
      {(place.stats?.contaminationReportsCount ?? 0) > 0 && (
        <div className="absolute right-3 top-3 z-10">
          <ContaminationRiskBadge
            count={place.stats?.contaminationReportsCount ?? 0}
            variant="card"
          />
        </div>
      )}
      <div className="absolute left-3 top-3 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span aria-hidden>{safetyDot}</span>
          {safetyLabel}
        </span>
      </div>
      {showGoogleHint ? (
        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/70">
          Google
        </span>
      ) : null}
    </>
  )
}
