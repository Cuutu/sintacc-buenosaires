"use client"

import Link from "next/link"
import { MapPinned, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorite-button"
import type { IPlace } from "@/models/Place"

interface StickyActionBarMobileProps {
  place: IPlace
  className?: string
}

export function StickyActionBarMobile({ place, className }: StickyActionBarMobileProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  const hasPhone = !!place.contact?.phone
  const hasWhatsApp = !!place.contact?.whatsapp
  const whatsappNumber = place.contact?.whatsapp?.replace(/\D/g, "") || ""
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : null

  return (
    <div
      className={`
        md:hidden fixed bottom-0 left-0 right-0 z-40
        flex items-center justify-around gap-2 p-4
        bg-background/95 backdrop-blur-xl border-t border-border/50
        pb-[calc(1rem+env(safe-area-inset-bottom))]
        ${className ?? ""}
      `}
    >
      <Button
        asChild
        size="lg"
        className="min-h-[48px] min-w-[48px] flex-1 max-w-[140px]"
      >
        <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPinned className="h-5 w-5" />
          Cómo llegar
        </Link>
      </Button>

      {hasWhatsApp && whatsappUrl && (
        <Button
          asChild
          size="lg"
          variant="outline"
          className="min-h-[48px] min-w-[48px] flex-1 max-w-[140px]"
        >
          <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </Link>
        </Button>
      )}

      {hasPhone && (
        <Button
          asChild
          size="lg"
          variant="outline"
          className="min-h-[48px] min-w-[48px] flex-1 max-w-[140px]"
        >
          <a href={`tel:${place.contact?.phone}`}>
            <Phone className="h-5 w-5" />
            Llamar
          </a>
        </Button>
      )}

      <div className="min-h-[48px] min-w-[48px] flex items-center justify-center [&>button]:min-h-[48px] [&>button]:min-w-[48px]">
        <FavoriteButton placeId={place._id.toString()} />
      </div>
    </div>
  )
}
