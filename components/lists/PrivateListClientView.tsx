"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Map as MapIcon, MapPin, User } from "lucide-react"
import { IPlace } from "@/models/Place"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { PrivateGuideAccordionItem } from "@/components/lists/PrivateGuideAccordionItem"
import type { MapboxMapRef } from "@/components/map-view/MapboxMap"
import { cn } from "@/lib/utils"

const PrivateListMap = dynamic(
  () =>
    import("@/components/lists/PrivateListMap").then((m) => m.PrivateListMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-[#0c100e] text-sm text-white/50">
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
  const mapApiRef = useRef<MapboxMapRef | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)

  const places = useMemo(
    () => (list.placeIds ?? []) as IPlace[],
    [list.placeIds]
  )
  const creatorName =
    list.createdBy?.name?.trim() || "un colaborador de CeliMap"
  const updatedLabel = formatUpdatedAt(list.updatedAt)

  /** Única fuente de verdad: selección + acordeón abierto */
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null)

  const countLabel = `${places.length} recomendación${places.length !== 1 ? "es" : ""}`

  const placesWithMeta = useMemo(
    () =>
      places.map((place, index) => ({
        place,
        order: index + 1,
        note: noteForPlace(list, place._id.toString()),
      })),
    [places, list]
  )

  const scrollToPlace = useCallback((id: string) => {
    requestAnimationFrame(() => {
      document
        .getElementById(`guide-place-${id}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "nearest" })
    })
  }, [])

  const selectFromMap = useCallback(
    (place: IPlace) => {
      const id = place._id.toString()
      setActivePlaceId(id)
      setOpenPlaceId(id)
      scrollToPlace(id)
    },
    [scrollToPlace]
  )

  const toggleAccordion = useCallback((id: string) => {
    setActivePlaceId(id)
    setOpenPlaceId((prev) => (prev === id ? null : id))
  }, [])

  const resetMapView = useCallback(() => {
    setOpenPlaceId(null)
    setActivePlaceId(null)
    mapApiRef.current?.fitAllPlaces({ maxZoom: 13, padding: 56 })
    mainRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] overflow-x-hidden px-3 pb-8 pt-3 sm:px-4 md:px-6 md:pt-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold tracking-wide text-primary">
          CeliMap
        </span>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/55">
          Lista privada (enlace)
        </span>
      </header>

      {/* Hero compacto */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-[#0c100e] p-3.5 md:p-4">
        <div className="flex gap-3">
          {(list.coverImage || places[0]?.photos?.[0]) && (
            <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg sm:block">
              <Image
                src={list.coverImage || places[0].photos![0]}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
                priority
              />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              {list.name}
            </h1>
            {list.description ? (
              <p className="line-clamp-2 text-sm text-white/65">
                {list.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
              {list.destination ? (
                <span className="inline-flex items-center gap-1 text-primary/90">
                  <MapPin className="h-3 w-3" />
                  {list.destination}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                {list.createdBy?.image ? (
                  <Image
                    src={list.createdBy.image}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                  />
                ) : (
                  <User className="h-3 w-3" />
                )}
                Preparada por{" "}
                <span className="font-semibold text-white/85">{creatorName}</span>
              </span>
              <span aria-hidden>·</span>
              <span>{countLabel}</span>
              {updatedLabel ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Actualizada el {updatedLabel}</span>
                </>
              ) : null}
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={resetMapView}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
              >
                <MapIcon className="h-3.5 w-3.5" />
                Ver todos en el mapa
              </button>
            </div>
            <p className="text-[10px] text-white/35">
              Lista privada · Solo pueden acceder quienes tengan este enlace
            </p>
          </div>
        </div>
      </section>

      <section
        ref={mainRef as never}
        className={cn(
          "grid items-start gap-4",
          // Desktop: recomendaciones 35–40% | mapa 60–65%
          "md:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]"
        )}
      >
        {/* Mobile: mapa primero */}
        <div
          className={cn(
            "order-1 md:order-2",
            "md:sticky md:top-3",
            "h-[42vh] min-h-[300px] max-h-[420px]",
            "md:h-[calc(100vh-7.5rem)] md:min-h-[600px] md:max-h-none"
          )}
        >
          <PrivateListMap
            places={places}
            activePlaceId={activePlaceId ?? undefined}
            onPlaceSelect={selectFromMap}
            mapRefOuter={mapApiRef}
            className="h-full w-full"
          />
        </div>

        {/* Acordeones */}
        <div className="order-2 space-y-2 md:order-1 md:max-h-[calc(100vh-7.5rem)] md:overflow-y-auto md:pr-1">
          <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-white/40">
            Recomendaciones
          </p>
          {placesWithMeta.map(({ place, order, note }) => {
            const id = place._id.toString()
            return (
              <PrivateGuideAccordionItem
                key={id}
                place={place}
                order={order}
                note={note}
                creatorName={creatorName}
                creatorImage={list.createdBy?.image}
                open={openPlaceId === id}
                active={activePlaceId === id}
                onToggle={() => toggleAccordion(id)}
              />
            )
          })}
        </div>
      </section>

      <p className="mt-6 text-center text-xs leading-relaxed text-white/45">
        Verificá siempre la información con el establecimiento antes de consumir.
        {updatedLabel ? ` Guía actualizada el ${updatedLabel}.` : ""}
      </p>
    </div>
  )
}
