"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MapPin, User } from "lucide-react"
import { IPlace } from "@/models/Place"

interface ListCreator {
  _id: string
  name?: string
  image?: string
}

export interface ListWithDetails {
  _id: string
  name: string
  description?: string
  placeIds: (IPlace | { _id: string; name: string; neighborhood: string; photos?: string[]; type?: string })[]
  createdBy: ListCreator
  likesCount: number
  isPublic: boolean
}

interface ListCardProps {
  list: ListWithDetails
  variant?: "default" | "compact"
}

export function ListCard({ list, variant = "default" }: ListCardProps) {
  const places = list.placeIds ?? []
  const firstPlaces = places.slice(0, 4)
  const photo =
    firstPlaces.find((p) => p.photos?.[0])?.photos?.[0] ||
    (firstPlaces[0] as IPlace)?.photos?.[0]

  if (variant === "compact") {
    return (
      <Link href={`/listas/${list._id}`}>
        <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full">
          <div className="flex">
            <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <MapPin className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <CardContent className="flex-1 p-4 flex flex-col justify-center">
              <h3 className="font-semibold line-clamp-1">{list.name}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{list.createdBy?.name ?? "Usuario"}</span>
                <span>·</span>
                <Heart className="h-3 w-3" />
                <span>{list.likesCount}</span>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/listas/${list._id}`}>
      <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full group">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <h3 className="font-bold text-white drop-shadow-md line-clamp-2">
              {list.name}
            </h3>
            <span className="flex items-center gap-1 text-white/90 text-sm shrink-0">
              <Heart className="h-4 w-4 fill-current" />
              {list.likesCount}
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          {list.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {list.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {list.createdBy?.image ? (
              <img
                src={list.createdBy.image}
                alt=""
                className="w-6 h-6 rounded-full"
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
    </Link>
  )
}
