"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Share2 } from "lucide-react"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { PlaceSaveButton } from "./PlaceSaveButton"

interface PlaceHeroChromeProps {
  placeId: string
  name: string
  shareUrl: string
}

export function PlaceHeroChrome({ placeId, name, shareUrl }: PlaceHeroChromeProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/mapa")
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} · CeliMap`, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
      trackEvent("place_share", { placeId })
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-3 lg:hidden">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Volver"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F5EF]/88 text-[#1F4D35] shadow-sm backdrop-blur-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartir"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F5EF]/88 text-[#1F4D35] shadow-sm backdrop-blur-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <PlaceSaveButton placeId={placeId} variant="icon" />
      </div>
    </div>
  )
}
