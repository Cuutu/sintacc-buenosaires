"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Navigation } from "lucide-react"
import { MAP_SORT_STORAGE_KEY } from "@/components/map-view/place-sort"
import { setLocationAutoEnabled } from "@/lib/location-preference"
import { cn } from "@/lib/utils"

/**
 * "Cerca mío" del hero: pide la ubicación con el toque (si no, el navegador traga el
 * permiso) y abre el mapa centrado ahí, con la lista ordenada por cercanía. Si no
 * se puede ubicar, abre el mapa igual.
 */
export function NearMeButton({ className }: { className?: string }) {
  const router = useRouter()
  const [locating, setLocating] = useState(false)

  const openMap = (coords?: { lat: number; lng: number }) => {
    if (!coords) {
      router.push("/mapa")
      return
    }
    try {
      sessionStorage.setItem(MAP_SORT_STORAGE_KEY, "nearest")
    } catch {
      /* almacenamiento bloqueado */
    }
    setLocationAutoEnabled(true)
    const lat = coords.lat.toFixed(5)
    const lng = coords.lng.toFixed(5)
    router.push(`/mapa?lat=${lat}&lng=${lng}&zoom=15`)
  }

  const handleClick = () => {
    if (locating) return
    if (!window.isSecureContext || !navigator.geolocation) {
      openMap()
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        openMap({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => {
        setLocating(false)
        openMap()
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={locating}
      data-testid="home-near-me"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#F7F3EB]/40 px-4 text-sm font-extrabold text-[#F7F3EB] transition-colors hover:bg-[#F7F3EB]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60",
        className
      )}
    >
      {locating ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Navigation className="h-4 w-4" strokeWidth={2.2} aria-hidden />
      )}
      {locating ? "Ubicándote…" : "Cerca mío"}
    </button>
  )
}
