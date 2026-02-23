"use client"

import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FabButtonsProps {
  onNearMe: () => void
  /** px from bottom - debe estar arriba del sheet */
  bottomOffset?: string
}

export function FabButtons({
  onNearMe,
  bottomOffset = "calc(18vh + 1rem)",
}: FabButtonsProps) {
  return (
    <div
      className="fixed right-4 z-30"
      style={{ bottom: bottomOffset }}
    >
      <Button
        size="icon"
        className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-full shadow-lg bg-primary hover:bg-primary/90"
        onClick={onNearMe}
        aria-label="Ir a mi ubicación"
      >
        <MapPin className="h-5 w-5" />
      </Button>
    </div>
  )
}
