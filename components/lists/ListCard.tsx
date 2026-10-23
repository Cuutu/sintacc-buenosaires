"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { Globe, Heart, Link2, Lock, User } from "lucide-react"
import { IPlace } from "@/models/Place"
import { type ListVisibility } from "@/lib/lists/constants"
import { formatPlacesCount, listPlacesCount } from "@/lib/lists/card-places"
import { LIST_SHARE_LABELS, listShareState, type ListShareState } from "@/lib/lists/share-state"
import { listsChip } from "@/components/lists/lists-ui"
import { cn } from "@/lib/utils"

interface ListCreator {
  _id: string
  name?: string
  image?: string
}

export interface ListPlaceNote {
  placeId: string | { toString(): string }
  note?: string
}

export interface ListWithDetails {
  _id: string
  name: string
  description?: string
  destination?: string
  coverImage?: string
  placeIds: (IPlace | { _id: string; name: string; neighborhood: string; photos?: string[]; type?: string })[]
  placeNotes?: ListPlaceNote[]
  /** Lugares publicados de la lista. En /listas sólo vienen cargados los primeros (para la foto). */
  placesCount?: number
  createdBy: ListCreator
  likesCount: number
  isPublic: boolean
  visibility?: ListVisibility | string
  linkStatus?: string | null
  privateSharePath?: string | null
  privateAccessToken?: string | null
  updatedAt?: string | Date
}

const SHARE_ICONS: Record<ListShareState, typeof Globe> = { public: Globe, link: Link2, private: Lock }

function listCoverPhoto(list: ListWithDetails): string | undefined {
  if (list.coverImage) return list.coverImage
  const places = list.placeIds ?? []
  return places.find((p) => p && "photos" in p && p.photos?.[0])?.photos?.[0]
}

/** Sello con cómo se comparte la lista (solo en "Mis listas"). */
export function ListShareChip({ list }: { list: ListWithDetails }) {
  const state = listShareState(list)
  const Icon = SHARE_ICONS[state]
  return (
    <span className={listsChip}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.6} aria-hidden />
      {LIST_SHARE_LABELS[state]}
    </span>
  )
}

/**
 * Cara de la tarjeta de lista, la misma en /listas y en "Mis listas" (revisión 23/10):
 * portada con el nombre en Fraunces itálica encima, como las tarjetas de lugar, y abajo
 * el autor y la cantidad de lugares. `chip` va arriba a la izquierda; `children`, abajo
 * de todo (las acciones de la dueña).
 */
export function ListCardFace({
  list,
  chip,
  children,
  className,
}: {
  list: ListWithDetails
  chip?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const photo = listCoverPhoto(list)
  const count = listPlacesCount(list)
  const author = list.createdBy?.name?.trim() || "Usuario"
  const nameSize = list.name.length > 32 ? "text-[23px]" : "text-[27px]"

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-[26px] bg-white p-2 shadow-[0_14px_34px_-26px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] transition-shadow duration-200 hover:shadow-[0_22px_44px_-24px_rgba(31,42,34,0.55),0_0_0_1px_rgba(45,74,52,0.12)]",
        className
      )}
    >
      <div
        className={cn(
          "relative h-[172px] overflow-hidden rounded-[20px]",
          photo ? "bg-[#2D4A34]/10" : "celi-trigo-crema bg-[#2D4A34]"
        )}
      >
        {photo ? (
          <>
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 330px"
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,30,23,0.18)_0%,rgba(20,30,23,0)_28%,rgba(20,30,23,0.5)_62%,rgba(20,30,23,0.86)_100%)]"
              aria-hidden
            />
          </>
        ) : null}
        {chip ? <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)]">{chip}</div> : null}
        <h3
          className={cn(
            "absolute inset-x-4 bottom-3 line-clamp-2 font-serif font-medium italic leading-[1.0] tracking-[-0.02em] text-white",
            nameSize,
            photo && "[text-shadow:0_1px_12px_rgba(0,0,0,0.35)]"
          )}
        >
          {list.name}
        </h3>
      </div>

      <div className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#2D4A34]">
          {list.createdBy?.image ? (
            <Image
              src={list.createdBy.image}
              alt=""
              width={22}
              height={22}
              className="h-[22px] w-[22px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#F1ECE2]" aria-hidden>
              <User className="h-3 w-3 text-[#5E6A60]" />
            </span>
          )}
          <span className="truncate">{author}</span>
        </span>
        <span className="shrink-0 text-sm font-bold text-[#5E6A60]">{formatPlacesCount(count)}</span>
      </div>
      {children}
    </article>
  )
}

interface ListCardProps {
  list: ListWithDetails
  href?: string
}

/** Tarjeta de /listas: toda la tarjeta lleva a la lista. Los "♥" solo si hay alguno. */
export function ListCard({ list, href }: ListCardProps) {
  const isPrivate = listShareState(list) !== "public"
  const targetHref = href || (isPrivate && list.privateSharePath ? list.privateSharePath : `/listas/${list._id}`)
  const chip =
    list.likesCount > 0 ? (
      <span className={listsChip}>
        <Heart className="h-3 w-3 shrink-0 fill-[#B84420] text-[#B84420]" aria-hidden />
        {list.likesCount}
        <span className="sr-only"> me gusta</span>
      </span>
    ) : null

  return (
    <Link
      href={targetHref}
      className="block h-full rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F7F3EB]"
    >
      <ListCardFace list={list} chip={chip} />
    </Link>
  )
}
