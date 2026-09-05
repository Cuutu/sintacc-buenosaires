"use client"

import { LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FabButtonsProps {
  onNearMe: () => void
  locating?: boolean
  /** px from bottom - debe estar arriba del sheet */
  bottomOffset?: string
}

export function FabButtons({
  onNearMe,
  locating = false,
  bottomOffset = "calc(18vh + 1rem)",
}: FabButtonsProps) {
  return (
    <div
      className="fixed right-3 z-30 sm:right-4"
      style={{ bottom: bottomOffset }}
    >
      <Button
        size="icon"
        className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-full border border-white/35 bg-primary shadow-[0_8px_24px_-10px_rgba(184,68,32,0.45),inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-primary/90"
        onClick={onNearMe}
        disabled={locating}
        aria-label="Ir a mi ubicación"
      >
        <LocateFixed className="h-5 w-5 stroke-[2]" />
      </Button>
    </div>
  )
}
