"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { PlaceCard } from "@/components/place-card"
import type { IPlace } from "@/models/Place"
import { listsUi } from "@/components/lists/lists-ui"

type SavedPlace = IPlace & {
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
}

/**
 * Lugar guardado (favoritos o una lista): la tarjeta nueva de lugar, la de la home y
 * las landings, con "Ver en mapa" abajo (la tarjeta entera ya lleva a la ficha).
 * `compact`: la fila con foto chica a la izquierda, para el celular.
 */
export function SavedPlaceCard({ place, compact = false }: { place: SavedPlace; compact?: boolean }) {
  if (compact) return <PlaceCard place={place} variant="compact" />
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <PlaceCard place={place} />
      </div>
      <Link href={`/mapa?place=${place._id.toString()}`} className={`${listsUi.link} self-start px-2`}>
        <MapPin className="h-4 w-4" aria-hidden />
        Ver en mapa
      </Link>
    </div>
  )
}
