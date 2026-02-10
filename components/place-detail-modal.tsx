"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MapPin, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { IPlace } from "@/models/Place"
import { TYPES } from "@/lib/constants"

interface PlaceDetailModalProps {
  placeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlaceDetailModal({ placeId, open, onOpenChange }: PlaceDetailModalProps) {
  const [place, setPlace] = useState<IPlace & { stats?: any } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && placeId) {
      setLoading(true)
      fetch(`/api/places/${placeId}`)
        .then((res) => res.json())
        .then((data) => setPlace(data))
        .catch(() => setPlace(null))
        .finally(() => setLoading(false))
    } else {
      setPlace(null)
    }
  }, [open, placeId])

  const typeConfig = place ? TYPES.find((t) => t.value === place.type) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="py-12 animate-pulse space-y-4">
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-6 w-2/3 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ) : place ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{place.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {place.photos && place.photos.length > 0 ? (
                <div className="relative h-40 w-full rounded-lg overflow-hidden">
                  <Image
                    src={place.photos[0]}
                    alt={place.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 100vw, 512px"
                  />
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-background/90 text-foreground">
                      {typeConfig?.emoji} {typeConfig?.label || place.type}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="relative h-32 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-5xl">{typeConfig?.emoji || "📍"}</span>
                  <Badge className="absolute bottom-2 left-2">
                    {typeConfig?.label || place.type}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{place.address}</span>
              </div>

              {place.stats && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{place.stats.avgRating?.toFixed(1) || "—"}</span>
                  <span className="text-muted-foreground">
                    ({place.stats.totalReviews || 0} reseñas)
                  </span>
                </div>
              )}

              {place.tags && place.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {place.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link href={`/lugar/${place._id}`}>Ver detalle completo</Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`,
                      "_blank"
                    )
                  }
                  title="Ver en Google Maps"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : placeId && !loading ? (
          <p className="py-8 text-center text-muted-foreground">No se pudo cargar el lugar</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
