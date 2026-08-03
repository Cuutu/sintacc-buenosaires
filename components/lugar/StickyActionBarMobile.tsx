"use client"

import Link from "next/link"
import { MapPinned, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorite-button"
import { ShareButton } from "@/components/share/ShareButton"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { features } from "@/lib/features"
import type { IPlace } from "@/models/Place"

interface StickyActionBarMobileProps {
  place: IPlace
  shareUrl: string
  className?: string
}

export function StickyActionBarMobile({ place, shareUrl, className }: StickyActionBarMobileProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  const { data: session } = useSession()
  const router = useRouter()
  const showFavorite = features.favorites && session

  return (
    <div
      className={`
        md:hidden fixed left-0 right-0 z-40
        bottom-[var(--bottom-nav-clearance)]
        flex items-center justify-center gap-2 p-3
        bg-background/95 backdrop-blur-xl border-t border-border/50
        ${className ?? ""}
      `}
    >
      <Button asChild size="lg" className="min-h-[48px] flex-1">
        <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPinned className="h-5 w-5 mr-1" />
          Ir
        </Link>
      </Button>

      <ShareButton
        title={`${place.name} · Celimap`}
        shareUrl={shareUrl}
        eventProps={{ placeId: place._id.toString() }}
        className="min-h-[48px] flex-1"
        showLabel={false}
      />

      {showFavorite ? (
        <div className="flex-1 [&>button]:w-full [&>button]:min-h-[48px] [&>button]:justify-center">
          <FavoriteButton placeId={place._id.toString()} />
        </div>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="min-h-[48px] flex-1"
          onClick={() => !session && router.push("/login")}
        >
          <Heart className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
