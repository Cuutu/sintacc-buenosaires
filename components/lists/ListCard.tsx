"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Lock, MapPin, User } from "lucide-react"
import { IPlace } from "@/models/Place"
import { LIST_VISIBILITY, type ListVisibility } from "@/lib/lists/constants"

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
  createdBy: ListCreator
  likesCount: number
  isPublic: boolean
  visibility?: ListVisibility | string
  linkStatus?: string | null
  privateSharePath?: string | null
  privateAccessToken?: string | null
  updatedAt?: string | Date
}

interface ListCardProps {
  list: ListWithDetails
  variant?: "default" | "compact"
  /** Si true, no navega (owner usa gestión aparte) */
  disableLink?: boolean
  href?: string
}

export function ListCard({
  list,
  variant = "default",
  disableLink = false,
  href,
}: ListCardProps) {
  const places = list.placeIds ?? []
  const firstPlaces = places.slice(0, 4)
  const photo =
    list.coverImage ||
    firstPlaces.find((p) => p.photos?.[0])?.photos?.[0] ||
    (firstPlaces[0] as IPlace)?.photos?.[0]
  const isPrivate = list.visibility === LIST_VISIBILITY.PRIVATE_LINK || list.isPublic === false
  const targetHref =
    href ||
    (isPrivate && list.privateSharePath
      ? list.privateSharePath
      : `/listas/${list._id}`)

  const body =
    variant === "compact" ? (
      <Card className="h-full overflow-hidden transition-colors hover:border-primary/50">
        <div className="flex">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden bg-muted">
            {photo ? (
              <Image
                src={photo}
                alt={`${list.name} - lugares sin gluten`}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <MapPin className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <h3 className="line-clamp-1 font-semibold">{list.name}</h3>
              {isPrivate ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Privada" />
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{list.createdBy?.name ?? "Usuario"}</span>
              {!isPrivate ? (
                <>
                  <span>·</span>
                  <Heart className="h-3 w-3" />
                  <span>{list.likesCount}</span>
                </>
              ) : (
                <>
                  <span>·</span>
                  <span>Privada mediante enlace</span>
                </>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    ) : (
      <Card className="group h-full overflow-hidden transition-colors hover:border-primary/50">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={`${list.name} - lista de lugares sin gluten`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
            <h3 className="line-clamp-2 font-bold text-white drop-shadow-md">
              {list.name}
            </h3>
            {isPrivate ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] text-white/90">
                <Lock className="h-3 w-3" />
                Privada
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-sm text-white/90">
                <Heart className="h-4 w-4 fill-current" />
                {list.likesCount}
              </span>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          {list.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {list.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {list.createdBy?.image ? (
              <Image
                src={list.createdBy.image}
                alt={list.createdBy?.name || "Usuario"}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span>{list.createdBy?.name ?? "Usuario"}</span>
            <span>·</span>
            <span>{places.length} lugares</span>
          </div>
        </CardContent>
      </Card>
    )

  if (disableLink) return body
  return <Link href={targetHref}>{body}</Link>
}
