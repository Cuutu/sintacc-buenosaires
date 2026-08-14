"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Star, UtensilsCrossed } from "lucide-react"
import { IPlace } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import { TYPES, getTagBadgeConfig } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  getSafetyBadge,
  inferSafetyLevel,
} from "@/components/featured/featured-utils"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
)

const SECONDARY_TAGS = [
  "certificado_sin_tacc",
  "cocina_separada",
  "sin_info",
] as const

const SAFETY_TAG_IDS = new Set(["100_gf", "opciones_sin_tacc"])

interface ListPlaceCardProps {
  place: IPlace & {
    stats?: {
      avgRating?: number
      totalReviews?: number
      contaminationReportsCount?: number
    }
  }
}

function PlaceCoverFallback({ name, type }: { name: string; type: string }) {
  const initial = (name.trim()[0] || "?").toUpperCase()
  const hueShift = (initial.charCodeAt(0) % 5) * 4

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(145deg, hsl(158 ${28 + hueShift}% ${12 + (hueShift % 3)}%) 0%, hsl(160 22% 8%) 55%, hsl(152 18% 6%) 100%)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#10d98a,transparent_55%)] opacity-[0.12]" />
      <div className="relative flex flex-col items-center gap-1.5 text-primary/70">
        <UtensilsCrossed className="h-7 w-7" strokeWidth={1.5} />
        <span className="text-2xl font-bold tracking-tight text-olive/40">{initial}</span>
      </div>
      <span className="sr-only">{TYPE_LABELS[type] ?? "Lugar"}</span>
    </div>
  )
}

export function ListPlaceCard({ place }: ListPlaceCardProps) {
  const placeId = place._id.toString()
  const detailHref = getPlacePath(place)
  const mapHref = `/mapa?place=${placeId}`
  const primaryType = place.types?.[0] ?? place.type
  const typeLabel = TYPE_LABELS[primaryType]
  const photo = place.photos?.[0]
  const safetyLevel = inferSafetyLevel(place)
  const safety = safetyLevel ? getSafetyBadge(safetyLevel) : null

  const displaySecondary = (place.tags ?? [])
    .filter((tag) => !SAFETY_TAG_IDS.has(tag))
    .filter((tag) => SECONDARY_TAGS.includes(tag as (typeof SECONDARY_TAGS)[number]))
    .slice(0, 2)

  const hasCelimapRating =
    place.stats?.totalReviews != null && place.stats.totalReviews > 0
  const googleRating = place.googleSnapshot?.rating
  const googleCount = place.googleSnapshot?.userRatingCount

  return (
    <article
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-olive/10 bg-card",
        "transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-primary/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)]",
        "motion-safe:hover:-translate-y-0.5",
        "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/40"
      )}
    >
      <Link
        href={detailHref}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-card">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <PlaceCoverFallback name={place.name} type={primaryType} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
          {typeLabel ? (
            <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] truncate rounded-md border border-olive/15 bg-[#0a0e12]/88 px-2 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
              {typeLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-3.5 pt-3">
          <div className="min-h-[2.75rem]">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-olive transition-colors group-hover:text-primary">
              {place.name}
            </h3>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="truncate">
              {place.neighborhood || place.address || "Ubicación no disponible"}
            </span>
          </p>

          <div className="flex min-h-[1.25rem] items-center gap-1.5 text-sm">
            {hasCelimapRating ? (
              <>
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-semibold text-olive">
                  {place.stats?.avgRating?.toFixed(1)}
                </span>
                <span className="text-muted-foreground">({place.stats?.totalReviews})</span>
              </>
            ) : googleRating != null && Number.isFinite(googleRating) ? (
              <>
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-semibold text-olive">{googleRating.toFixed(1)}</span>
                {googleCount != null && googleCount > 0 ? (
                  <span className="text-muted-foreground">
                    ({googleCount.toLocaleString("es-AR")})
                  </span>
                ) : null}
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Google
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Sin reseñas aún</span>
            )}
          </div>

          <div className="mt-0.5 flex min-h-[3.25rem] flex-wrap content-start items-start gap-1.5">
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
            {displaySecondary.map((tag) => {
              const config = getTagBadgeConfig(tag)
              return (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-olive/15 bg-olive/5 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {tag === "certificado_sin_tacc" ? "Sin TACC" : config.label}
                </span>
              )
            })}
            {(place.stats?.contaminationReportsCount ?? 0) > 0 ? (
              <ContaminationRiskBadge
                count={place.stats?.contaminationReportsCount ?? 0}
                variant="inline"
              />
            ) : null}
          </div>
        </div>
      </Link>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-olive/10 p-3.5 pt-3">
        <Link
          href={detailHref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-2 text-xs font-bold text-primary-foreground",
            "transition hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          Ver detalle
        </Link>
        <Link
          href={mapHref}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-olive/15 bg-olive/5 px-2 text-xs font-semibold text-olive/80",
            "transition hover:border-olive/25 hover:bg-olive/5 hover:text-olive",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          Ver en mapa
        </Link>
      </div>
    </article>
  )
}
