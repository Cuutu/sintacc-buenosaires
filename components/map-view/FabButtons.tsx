"use client"

import { LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FabButtonsProps {
  onNearMe: () => void
  locating?: boolean
  /** px from bottom - debe estar arriba del sheet */
  bottomOffset?: string
}

/** Ubicación es acción secundaria: botón blanco (la terracota queda para la acción principal). */
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
        className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-full border border-[#2D4A34]/[0.08] bg-white text-[#2D4A34] shadow-[0_8px_20px_-8px_rgba(31,42,34,0.40)] hover:bg-[#F7F3EB]"
        onClick={onNearMe}
        disabled={locating}
        aria-label="Ir a mi ubicación"
      >
        <LocateFixed className="h-5 w-5 stroke-[2]" />
      </Button>
    </div>
  )
}
