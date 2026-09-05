import type { ComponentType } from "react"
import { Coffee, MapPin, ShoppingBasket, Star, Store, Utensils } from "lucide-react"
import type { IPlace } from "@/models/Place"
import { cn } from "@/lib/utils"
import {
  getPlaceRatingLine,
  getPlaceSafety,
  getPlaceTypeKey,
} from "./place-selected-card-model"

export const PLACE_TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  restaurant: Utensils,
  cafe: Coffee,
  bakery: Store,
  store: ShoppingBasket,
  icecream: Store,
  bar: Store,
  other: MapPin,
}

export function PlaceSafetyBadge({ place, size = "md" }: { place: IPlace; size?: "sm" | "md" }) {
  const safety = getPlaceSafety(place)
  return (
    <span
      className={cn(
        "inline-flex max-w-[80%] items-center gap-1.5 rounded-full border font-semibold leading-none tracking-[0.01em]",
        size === "sm" ? "px-2 py-[5px] text-[10.5px]" : "px-2.5 py-[6px] text-[11.5px]"
      )}
      style={{
        background: safety.badgeBg,
        borderColor: safety.badgeBorder,
        color: safety.badgeText,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-[#FDFBF7]"
        style={{ backgroundColor: safety.accent }}
        aria-hidden
      />
      {safety.label}
    </span>
  )
}

export function PlaceTypeGlyph({ place }: { place: IPlace }) {
  const TypeIcon = PLACE_TYPE_ICONS[getPlaceTypeKey(place)] ?? MapPin
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F4D35]/[0.07] text-[#1F4D35]"
      aria-hidden
    >
      <TypeIcon className="h-3.5 w-3.5 stroke-[1.85]" />
    </span>
  )
}

export function PlaceRatingRow({
  place,
  className,
}: {
  place: IPlace
  className?: string
}) {
  const rating = getPlaceRatingLine(place)
  if (!rating) return null
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] leading-none text-[#5F6B63]", className)}>
      <Star className="h-3 w-3 fill-[#C85A2E] text-[#C85A2E]" aria-hidden />
      <span className="font-semibold text-[#1F4D35]">{rating.score}</span>
      <span className="font-medium">{rating.source}</span>
      {rating.countLabel ? <span>{rating.countLabel}</span> : null}
    </p>
  )
}
