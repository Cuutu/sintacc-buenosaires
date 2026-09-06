"use client"

import Link from "next/link"
import { PlaceCard } from "@/components/place-card"
import { MapPin } from "lucide-react"
import type { PlaceSEO } from "@/lib/seo/places"
import { placeSeoToCardPlace } from "@/lib/seo/place-for-card"
import type { IPlace } from "@/models/Place"
import { normalizeInstagramUrl } from "@/lib/instagram-url"

interface ProvincialPlaceCardProps {
  place: PlaceSEO
  provinceSlug: string
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda / Dietética",
  icecream: "Heladería",
  bar: "Bar",
  other: "Otro",
}

export function ProvincialPlaceCard({ place, provinceSlug }: ProvincialPlaceCardProps) {
  const placeForCard = placeSeoToCardPlace(place) as IPlace & {
    stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
  }

  const instagramUrl = place.contact?.instagram
    ? normalizeInstagramUrl(place.contact.instagram)
    : null

  return (
    <div className="group">
      <PlaceCard place={placeForCard} />
      {place.address && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{place.address}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/mapa?place=${place._id}&citySlugs=${provinceSlug}`}
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
        >
          <MapPin className="h-4 w-4" />
          Ver en el mapa
        </Link>
        {instagramUrl && (
          <>
            <span className="text-muted-foreground">·</span>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Instagram
            </a>
          </>
        )}
      </div>
    </div>
  )
}
