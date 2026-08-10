"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, User, ExternalLink } from "lucide-react"
import { IPlace } from "@/models/Place"
import { ListPlaceCard } from "@/components/lists/ListPlaceCard"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { cn } from "@/lib/utils"

function noteForPlace(
  list: ListWithDetails,
  placeId: string
): string | undefined {
  const entry = list.placeNotes?.find((n) => {
    const id = typeof n.placeId === "string" ? n.placeId : n.placeId?.toString?.()
    return id === placeId
  })
  return entry?.note
}

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

interface PrivateListClientViewProps {
  list: ListWithDetails
}

export function PrivateListClientView({ list }: PrivateListClientViewProps) {
  const places = (list.placeIds ?? []) as IPlace[]

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-10 pt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-primary"
        >
          CeliMap
        </Link>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/55">
          Lista privada
        </span>
      </div>

      <header className="mb-5 rounded-2xl border border-white/10 bg-[#0c100e]/90 p-4">
        {list.coverImage || places[0]?.photos?.[0] ? (
          <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl">
            <Image
              src={list.coverImage || places[0].photos![0]}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
          </div>
        ) : null}

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {list.name}
        </h1>

        {list.destination ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-primary/90">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {list.destination}
          </p>
        ) : null}

        {list.description ? (
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {list.description}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
          {list.createdBy?.image ? (
            <Image
              src={list.createdBy.image}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-white/50" aria-hidden />
          )}
          <span>
            Recomendado por{" "}
            <span className="font-medium text-white/85">
              {list.createdBy?.name ?? "un colaborador de CeliMap"}
            </span>
          </span>
        </div>
      </header>

      <ol className="space-y-4">
        {places.map((place, index) => {
          const note = noteForPlace(list, place._id.toString())
          return (
            <li key={place._id.toString()} className="space-y-2">
              <div className="flex items-center gap-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-white/45">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] text-primary">
                  {index + 1}
                </span>
                Recomendación
              </div>

              {note ? (
                <blockquote
                  className={cn(
                    "rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3",
                    "text-sm leading-relaxed text-white/90"
                  )}
                >
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Nota del creador
                  </p>
                  {note}
                </blockquote>
              ) : null}

              <ListPlaceCard place={place} />

              <a
                href={mapsUrlForPlace(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/[0.07]"
              >
                <ExternalLink className="h-4 w-4 text-primary" aria-hidden />
                Cómo llegar
              </a>
            </li>
          )
        })}
      </ol>

      <p className="mt-8 text-center text-xs leading-relaxed text-white/45">
        Verificá siempre la información con el establecimiento antes de consumir.
        CeliMap y el creador de esta lista no reemplazan esa consulta.
      </p>
    </div>
  )
}
