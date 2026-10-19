"use client"

import Link from "next/link"
import { PlaceImage } from "@/components/place-image"
import { Check, Star } from "lucide-react"
import { IPlace } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import { getPlaceImageUrl } from "@/lib/place-image"
import { trackEvent } from "@/lib/analytics"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"
import { useClientOpenStatus } from "@/components/lugar/use-client-open-status"
import {
  getPlaceCardRating,
  getPlaceCoverTheme,
  getPlaceSafety,
  getPlaceSheetDetailTags,
  getPlaceTypeLabel,
} from "@/components/map-view/place-selected-card-model"
import { cn } from "@/lib/utils"

interface PlaceCardProps {
  place: IPlace & {
    stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
  }
  onMapClick?: (place: IPlace) => void
  /** Clic desde listado de ciudad (distinto de place_view en la ficha). */
  cityClickAnalytics?: {
    city_slug: string
    position: number
    source: string
  }
}

/**
 * Tarjeta "Edición" para listados (ciudades, provincias, categorías): portada con foto
 * o color con textura, nombre en Fraunces itálica y puntaje con su fuente.
 */
export function PlaceCard({ place, onMapClick, cityClickAnalytics }: PlaceCardProps) {
  const photoSrc = getPlaceImageUrl(place.photos?.[0], "popup")
  const cover = getPlaceCoverTheme(place)
  const safety = getPlaceSafety(place)
  const safetyLevel = inferSafetyLevel(place) ?? "unknown"
  const rating = getPlaceCardRating(place)
  const detailTags = getPlaceSheetDetailTags(place.tags)
  const reports = place.stats?.contaminationReportsCount ?? 0
  const meta = [getPlaceTypeLabel(place), place.neighborhood].filter(Boolean).join(" · ")
  // Los listados son ISR: "Abierto" se calcula recién al montar (ver use-client-open-status).
  const hours = useClientOpenStatus(place.openingHours)
  const openNow = hours.kind === "ready" && hours.detail.isOpen
  const onPhoto = Boolean(photoSrc)
  const coverInk = onPhoto ? "#FFFFFF" : cover.ink
  const nameSize = place.name.length > 32 ? "text-[23px]" : "text-[27px]"

  const trackCityClick = () => {
    if (!cityClickAnalytics) return
    trackEvent("city_to_place_click", {
      city_slug: cityClickAnalytics.city_slug,
      place_id: String(place._id),
      position: cityClickAnalytics.position,
      source: cityClickAnalytics.source,
    })
  }

  const cardContent = (
    <article className="group flex h-full flex-col rounded-[26px] bg-white p-2 shadow-[0_14px_34px_-26px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] transition-shadow duration-200 hover:shadow-[0_22px_44px_-24px_rgba(31,42,34,0.55),0_0_0_1px_rgba(45,74,52,0.12)]">
      <div
        className={cn("relative h-[172px] overflow-hidden rounded-[20px]", !onPhoto && cover.texture)}
        style={onPhoto ? undefined : { backgroundColor: cover.bg }}
      >
        {photoSrc ? (
          <>
            <PlaceImage
              src={photoSrc}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 330px"
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,30,23,0.18)_0%,rgba(20,30,23,0)_36%,rgba(20,30,23,0.72)_100%)]"
              aria-hidden
            />
          </>
        ) : null}
        <span className="absolute left-3 top-3 inline-flex h-7 max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-[#F7F3EB] px-2.5 text-[12px] font-black leading-none text-[#1F4D35] shadow-[0_4px_12px_-6px_rgba(20,30,23,0.45)]">
          {safetyLevel === "dedicated_gf" ? (
            <Check className="h-3 w-3 shrink-0" strokeWidth={3.2} aria-hidden />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: safety.accent }} aria-hidden />
          )}
          <span className="truncate">{safety.label}</span>
        </span>
        <h3
          className={cn(
            "absolute inset-x-4 bottom-3 line-clamp-2 font-serif font-medium italic leading-[1.0] tracking-[-0.02em]",
            nameSize,
            onPhoto && "[text-shadow:0_1px_12px_rgba(0,0,0,0.35)]"
          )}
          style={{ color: coverInk }}
        >
          {place.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[14.5px] font-extrabold text-[#2D4A34]">{meta || "Lugar"}</p>
          {rating ? (
            <p className="flex shrink-0 items-center gap-1 text-[14.5px] font-black text-[#2D4A34]" title={rating.label}>
              <Star className="h-3.5 w-3.5 fill-[#B84420] text-[#B84420]" aria-hidden />
              <span aria-hidden>{rating.score}</span>
              <span className="text-[11.5px] font-bold text-[#5E6A60]" aria-hidden>
                {rating.source}
              </span>
              <span className="sr-only">{rating.label}</span>
            </p>
          ) : null}
        </div>
        {openNow || detailTags.length > 0 || reports > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {openNow ? (
              <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#E3EEE5] px-2 text-[11px] font-bold text-[#1F4D35]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A4E]" aria-hidden />
                Abierto ahora
              </span>
            ) : null}
            {detailTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex h-[22px] items-center rounded-full bg-[#F1ECE2] px-2 text-[11px] font-bold text-[#2D4A34]"
              >
                {tag.label}
              </span>
            ))}
            {reports > 0 ? <ContaminationRiskBadge count={reports} variant="card" /> : null}
          </div>
        ) : null}
      </div>
    </article>
  )

  if (onMapClick) {
    return (
      <div onClick={() => onMapClick(place)}>
        {cardContent}
        <button
          type="button"
          className="mt-2 block w-full text-center text-sm font-bold text-[#B84420] hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            onMapClick(place)
          }}
        >
          Ver detalle →
        </button>
      </div>
    )
  }

  return (
    <Link
      href={getPlacePath(place)}
      onClick={trackCityClick}
      className="block h-full rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F7F3EB]"
    >
      {cardContent}
    </Link>
  )
}
