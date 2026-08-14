"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronDown, MapPin, Navigation, Star } from "lucide-react"
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

export interface PrivateGuideAccordionItemProps {
  place: IPlace & {
    stats?: {
      avgRating?: number
      totalReviews?: number
      contaminationReportsCount?: number
    }
  }
  order: number
  note?: string
  creatorName: string
  creatorImage?: string
  open: boolean
  active: boolean
  onToggle: () => void
}

export function PrivateGuideAccordionItem({
  place,
  order,
  note,
  creatorName,
  creatorImage,
  open,
  active,
  onToggle,
}: PrivateGuideAccordionItemProps) {
  const panelId = `guide-panel-${place._id}`
  const headerId = `guide-header-${place._id}`
  const primaryType = place.types?.[0] ?? place.type
  const typeLabel = TYPE_LABELS[primaryType] || "Lugar"
  const safetyLevel = inferSafetyLevel(place)
  const safety = safetyLevel ? getSafetyBadge(safetyLevel) : null

  const hasCelimapRating =
    place.stats?.totalReviews != null && place.stats.totalReviews > 0
  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount

  return (
    <article
      id={`guide-place-${place._id}`}
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        active ? "border-primary/45" : "border-olive/10"
      )}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-3 text-left",
            "min-h-[84px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
          )}
        >
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-olive/10 text-olive/80"
            )}
          >
            {order}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold leading-snug text-olive">
              {place.name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <span>{typeLabel}</span>
              <span aria-hidden>·</span>
              <span className="truncate">
                {place.neighborhood || "Sin barrio"}
              </span>
            </span>
            {safety && safetyLevel && safetyLevel !== "unknown" ? (
              <span
                className={cn(
                  "mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  safety.className
                )}
              >
                {safety.label}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className={cn(!open && "hidden")}
      >
        <div className="space-y-3 border-t border-olive/10 px-3 pb-3 pt-2.5">
          {note ? (
            <blockquote className="rounded-lg border border-primary/20 bg-primary/[0.08] px-3 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                {creatorImage ? (
                  <Image
                    src={creatorImage}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                  />
                ) : null}
                <p className="text-[11px] font-semibold text-primary">
                  Consejo de {creatorName}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-olive">{note}</p>
            </blockquote>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {hasCelimapRating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-olive">
                  {place.stats?.avgRating?.toFixed(1)}
                </span>
                <span className="text-muted-foreground">({place.stats?.totalReviews})</span>
              </span>
            ) : googleRating != null && Number.isFinite(googleRating) ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-olive">
                  {googleRating.toFixed(1)}
                </span>
                {googleCount != null && googleCount > 0 ? (
                  <span className="text-muted-foreground">
                    ({googleCount.toLocaleString("es-AR")})
                  </span>
                ) : null}
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Google
                </span>
              </span>
            ) : null}
          </div>

          {place.address ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>{place.address}</span>
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={mapsUrlForPlace(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-xs font-bold text-primary-foreground"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Cómo llegar
            </a>
            <Link
              href={getPlacePath(place)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-olive/15 bg-olive/5 px-2 text-xs font-semibold text-olive/80"
            >
              Ver información
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
