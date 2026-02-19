"use client"

import Link from "next/link"
import { MapPinned, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorite-button"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { features } from "@/lib/features"
import type { IPlace } from "@/models/Place"

interface StickyActionBarMobileProps {
  place: IPlace
  className?: string
}

export function StickyActionBarMobile({ place, className }: StickyActionBarMobileProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  const { data: session } = useSession()
  const router = useRouter()
  const showFavorite = features.favorites && session

  return (
    <div
      className={`
        md:hidden fixed bottom-0 left-0 right-0 z-40
        flex items-center justify-center gap-3 p-4
        bg-background/95 backdrop-blur-xl border-t border-border/50
        pb-[calc(1rem+env(safe-area-inset-bottom))]
        ${className ?? ""}
      `}
    >
      <Button asChild size="lg" className="min-h-[48px] flex-1 max-w-[180px]">
        <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPinned className="h-5 w-5 mr-2" />
          Cómo llegar
        </Link>
      </Button>

      {showFavorite ? (
        <div className="flex-1 max-w-[180px] [&>button]:w-full [&>button]:min-h-[48px] [&>button]:justify-center">
          <FavoriteButton placeId={place._id.toString()} />
        </div>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="min-h-[48px] flex-1 max-w-[180px]"
          onClick={() => !session && router.push("/login")}
        >
          <Heart className="h-5 w-5 mr-2" />
          Guardar
        </Button>
      )}
    </div>
  )
}
