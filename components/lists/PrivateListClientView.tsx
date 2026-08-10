"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { List, Map as MapIcon, MapPin, User } from "lucide-react"
import { IPlace } from "@/models/Place"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { PrivateGuidePlaceCard } from "@/components/lists/PrivateGuidePlaceCard"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/map-view/useMediaQuery"

const PrivateListMap = dynamic(
  () =>
    import("@/components/lists/PrivateListMap").then((m) => m.PrivateListMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-[#0c100e] text-sm text-white/50">
        Cargando mapa…
      </div>
    ),
  }
)

function noteForPlace(
  list: ListWithDetails,
  placeId: string
): string | undefined {
  const entry = list.placeNotes?.find((n) => {
    const id =
      typeof n.placeId === "string" ? n.placeId : n.placeId?.toString?.()
    return id === placeId
  })
  return entry?.note
}

function formatUpdatedAt(value?: string | Date) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  })
}

interface PrivateListClientViewProps {
  list: ListWithDetails & { updatedAt?: string | Date }
}

export function PrivateListClientView({ list }: PrivateListClientViewProps) {
  const isMobile = useIsMobile()
  const places = useMemo(
    () => (list.placeIds ?? []) as IPlace[],
    [list.placeIds]
  )
  const creatorName = list.createdBy?.name?.trim() || "un colaborador de CeliMap"
  const updatedLabel = formatUpdatedAt(list.updatedAt)
  const [view, setView] = useState<"lista" | "mapa">("lista")
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const countLabel = `${places.length} recomendación${places.length !== 1 ? "es" : ""}`

  const placesWithNotes = useMemo(
    () =>
      places.map((place, index) => ({
        place,
        order: index + 1,
        note: noteForPlace(list, place._id.toString()),
      })),
    [places, list]
  )

  const showMap = isMobile === false || view === "mapa"
  const showList = isMobile === false || view === "lista"

  const scrollToPlace = (id: string) => {
    setSelectedId(id)
    setView("lista")
    requestAnimationFrame(() => {
      document
        .getElementById(`guide-place-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-4 md:px-6 md:pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold tracking-wide text-primary">
          CeliMap
        </span>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/55">
          Lista privada
        </span>
      </header>

      <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0c100e]">
        {(list.coverImage || places[0]?.photos?.[0]) && (
          <div className="relative aspect-[21/9] max-h-[220px] w-full overflow-hidden">
            <Image
              src={list.coverImage || places[0].photos![0]}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1152px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c100e] via-[#0c100e]/40 to-transparent" />
          </div>
        )}

        <div className="space-y-3 p-4 md:p-5">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-[1.75rem]">
            {list.name}
          </h1>

          {list.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-white/70">
              {list.description}
            </p>
          ) : null}

          {list.destination ? (
            <p className="flex items-center gap-1.5 text-sm text-primary/90">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {list.destination}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              {list.createdBy?.image ? (
                <Image
                  src={list.createdBy.image}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-white/45" aria-hidden />
              )}
              <span>
                Preparada por{" "}
                <span className="font-semibold text-white/90">{creatorName}</span>
              </span>
            </span>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <span>{countLabel}</span>
            {updatedLabel ? (
              <>
                <span className="text-white/25" aria-hidden>
                  ·
                </span>
                <span>Actualizada el {updatedLabel}</span>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setView("mapa")
                if (places[0]) setSelectedId(places[0]._id.toString())
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              <MapIcon className="h-4 w-4" aria-hidden />
              Ver todos en el mapa
            </button>
          </div>

          <p className="text-[11px] text-white/40">
            Lista privada · Solo pueden acceder quienes tengan este enlace
          </p>
        </div>
      </section>

      {/* Mobile toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 md:hidden">
        <button
          type="button"
          onClick={() => setView("lista")}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition",
            view === "lista"
              ? "bg-primary/15 text-primary"
              : "text-white/55 hover:text-white/80"
          )}
        >
          <List className="h-4 w-4" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView("mapa")}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition",
            view === "mapa"
              ? "bg-primary/15 text-primary"
              : "text-white/55 hover:text-white/80"
          )}
        >
          <MapIcon className="h-4 w-4" />
          Mapa
        </button>
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] md:items-start md:gap-5">
        {showList ? (
          <div
            className={cn(
              "space-y-4",
              isMobile && view === "mapa" && "hidden"
            )}
          >
            {placesWithNotes.map(({ place, order, note }) => (
              <PrivateGuidePlaceCard
                key={place._id.toString()}
                place={place}
                order={order}
                note={note}
                creatorName={creatorName}
                creatorImage={list.createdBy?.image}
                selected={selectedId === place._id.toString()}
                onFocusOnMap={() => {
                  setSelectedId(place._id.toString())
                  setView("mapa")
                }}
              />
            ))}
          </div>
        ) : null}

        {showMap ? (
          <div
            className={cn(
              isMobile && view === "lista" && "hidden",
              "md:sticky md:top-4"
            )}
          >
            <PrivateListMap
              places={places}
              selectedPlaceId={selectedId}
              onPlaceSelect={(p) => scrollToPlace(p._id.toString())}
              className="h-[min(70vh,560px)] min-h-[280px] w-full [&_.mapboxgl-map]:h-full [&_.mapboxgl-map]:min-h-[280px]"
            />
            {isMobile && selectedId ? (
              <button
                type="button"
                className="mt-3 w-full text-center text-sm font-medium text-primary"
                onClick={() => scrollToPlace(selectedId)}
              >
                Ver este lugar en la lista
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-white/45">
        Verificá siempre la información con el establecimiento antes de consumir.
        {updatedLabel ? ` Guía actualizada el ${updatedLabel}.` : ""}
      </p>
    </div>
  )
}
