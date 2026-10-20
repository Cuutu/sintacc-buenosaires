"use client"

import { memo, type ComponentType } from "react"
import { PlaceImage } from "@/components/place-image"
import { Coffee, MapPin, ShoppingBasket, Star, Store, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"
import { IPlace } from "@/models/Place"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { FavoriteButton } from "@/components/favorite-button"
import { TYPES } from "@/lib/constants"
import { getPlaceImageUrl } from "@/lib/place-image"
import { getCanonicalPlaceArea } from "@/lib/place-location-display"
import { formatListDistance, metersBetween, type UserLatLng } from "./geo"
import { getCoverThemeForLevel, getPlaceCardRating } from "./place-selected-card-model"

interface PlaceMiniCardProps {
  place: IPlace & {
    stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
    googleSnapshot?: { rating?: number; userRatingCount?: number } | null
  }
  selected?: boolean
  /** Recibe el lugar: así la lista pasa un solo callback estable y la tarjeta (memo) no se redibuja. */
  onSelect?: (place: IPlace) => void
  userLocation?: UserLatLng | null
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

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
)

export const PlaceMiniCard = memo(function PlaceMiniCard({
  place,
  selected,
  onSelect,
  userLocation,
}: PlaceMiniCardProps) {
  const primaryType = String(place.types?.[0] ?? place.type ?? "")
  const TypeIcon = TYPE_ICONS[primaryType] || MapPin
  const typeLabel = primaryType && primaryType !== "other" ? TYPE_LABELS[primaryType] : undefined
  const safetyLevel = inferSafetyLevel(place) ?? "unknown"
  const photoSrc = getPlaceImageUrl(place.photos?.[0], "thumb")
  const cover = getCoverThemeForLevel(safetyLevel)
  // Misma fuente que el popover y la tarjeta del mapa: primero CeliMap, después Google.
  const ratingLabel = getPlaceCardRating(place)?.label ?? null

  const placeLat = place.location?.lat
  const placeLng = place.location?.lng
  const distanceLabel =
    userLocation && Number.isFinite(placeLat) && Number.isFinite(placeLng)
      ? formatListDistance(
          metersBetween(userLocation, { lat: placeLat as number, lng: placeLng as number })
        )
      : null

  const metaParts = [typeLabel, getCanonicalPlaceArea(place), distanceLabel].filter(Boolean)

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-[20px] border px-3 py-3 transition-all",
        selected
          ? "border-[#1F4D35]/22 bg-[#FFFEFB] shadow-[0_6px_16px_-10px_rgba(31,77,53,0.18)]"
          : "border-[#E8E1D6]/80 bg-[#F7F3EB]/55 hover:border-[#1F4D35]/18"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(place)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-pressed={selected}
        aria-label={`Seleccionar ${place.name}`}
      >
        <span className="relative mt-0.5 h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#1F4D35]/[0.08]">
          {photoSrc ? (
            <PlaceImage
              src={photoSrc}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            // Sin foto: la misma portada con espigas que la tarjeta del mapa y la ficha.
            <span
              className={cn("flex h-full w-full items-center justify-center", cover.texture)}
              style={{ backgroundColor: cover.bg, color: cover.ink }}
              aria-hidden
            >
              <TypeIcon className="h-5 w-5 stroke-[1.85]" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-serif text-[18px] font-medium italic leading-[1.1] tracking-[-0.015em] text-[#1F4D35]">
            {place.name}
          </h3>
          {metaParts.length > 0 ? (
            <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#5F6B63]">
              {metaParts.join(" · ")}
            </p>
          ) : null}
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {safetyLevel === "dedicated_gf" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#1F4D35]/20 bg-[#1F4D35]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1F4D35]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1F4D35]" aria-hidden />
                100% sin TACC
              </span>
            ) : safetyLevel === "gf_options" ? (
              // Misma pastilla que "100% sin TACC", en terracota (antes era texto suelto).
              <span className="inline-flex items-center gap-1 rounded-full border border-[#B64320]/20 bg-[#B64320]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A33B1B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B64320]" aria-hidden />
                Con opciones
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#CFC9BF]/60 bg-[#CFC9BF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#6B645C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#CFC9BF]" aria-hidden />
                Sin información
              </span>
            )}
            {ratingLabel && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F4D35]">
                <Star className="h-3.5 w-3.5 fill-[#C85A2E] text-[#C85A2E]" aria-hidden />
                {ratingLabel}
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
})
