"use client"

import { MapPin, Crosshair } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CABA_CENTER } from "./geo"

interface FabButtonsProps {
  onNearMe: () => void
  onRecenter: () => void
  /** px from bottom - debe estar arriba del sheet */
  bottomOffset?: string
}

export function FabButtons({
  onNearMe,
  onRecenter,
  bottomOffset = "calc(18vh + 1rem)",
}: FabButtonsProps) {
  return (
    <div
      className="fixed right-4 z-30 flex flex-col gap-2"
      style={{ bottom: bottomOffset }}
    >
      <Button
        size="icon"
        className="h-14 w-14 min-h-[48px] min-w-[48px] rounded-full shadow-lg"
        onClick={onNearMe}
        aria-label="Ver lugares cerca mío"
      >
        <MapPin className="h-6 w-6" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-14 w-14 min-h-[48px] min-w-[48px] rounded-full shadow-lg border-white/20 bg-black/40 backdrop-blur"
        onClick={onRecenter}
        aria-label="Recentrar en CABA"
      >
        <Crosshair className="h-6 w-6" />
      </Button>
    </div>
  )
}
