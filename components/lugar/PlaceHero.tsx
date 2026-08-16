"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, Share2 } from "lucide-react"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { PlaceSaveButton } from "./PlaceSaveButton"
import { emptyHeroPinSrc, heroSafetyCopy } from "./place-detail-ui"

interface PlaceHeroProps {
  photos?: string[]
  photoSource?: "community" | "google"
  name: string
  placeId: string
  shareUrl: string
  safetyLevel?: string
}

export function PlaceHero({
  photos,
  photoSource,
  name,
  placeId,
  shareUrl,
  safetyLevel,
}: PlaceHeroProps) {
  const router = useRouter()
  const hasPhoto = Boolean(photos?.[0])
  const safety = heroSafetyCopy(safetyLevel)
  const emptyPinSrc = emptyHeroPinSrc(safetyLevel)

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
    <div className="relative h-[220px] w-full overflow-hidden lg:rounded-[24px]">
      {hasPhoto ? (
        <Image
          src={photos![0]}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 760px"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F8F5EF]">
          <Image
            src={emptyPinSrc}
            alt=""
            width={88}
            height={112}
            priority
            className="h-[112px] w-auto object-contain"
          />
        </div>
      )}

      {hasPhoto ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(31,77,53,0.28) 0%, rgba(31,77,53,0.04) 42%, rgba(15,30,22,0.45) 100%)",
          }}
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(248,245,239,0.9))",
          }}
        />
      )}

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

      <div
        className={`absolute bottom-4 left-5 z-10 inline-flex ${
          hasPhoto && photoSource === "google" ? "max-w-[calc(100%-7rem)]" : "max-w-[calc(100%-2.5rem)]"
        } items-center rounded-full px-4 py-2 text-base font-bold shadow-[0_8px_24px_-12px_rgba(15,30,22,0.55)] ${safety.className}`}
      >
        {safety.label}
      </div>
      {hasPhoto && photoSource === "google" ? (
        <p className="absolute bottom-4 right-5 z-10 text-[10px] font-medium text-white/80">
          Foto: Google
        </p>
      ) : null}
    </div>
  )
}
