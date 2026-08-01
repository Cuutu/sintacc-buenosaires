"use client"

import { useEffect, useRef, useState } from "react"
import { loadGoogleMapsBrowser } from "@/lib/google-maps-browser"
import { cn } from "@/lib/utils"

interface GooglePlaceCoverProps {
  placeId: string
  className?: string
}

/**
 * Portada vía Places UI Kit (gmp-place-media). Solo para prueba en FeaturedCard.
 * Requiere NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY + Places UI Kit habilitado.
 */
export function GooglePlaceCover({ placeId, className }: GooglePlaceCoverProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host || !placeId) return

    const onError = () => {
      if (!cancelled) setStatus("error")
    }
    const onLoad = () => {
      if (!cancelled) setStatus("ready")
    }

    ;(async () => {
      try {
        await loadGoogleMapsBrowser()
        if (cancelled || !hostRef.current) return

        hostRef.current.replaceChildren()

        const compact = document.createElement("gmp-place-details-compact")
        compact.setAttribute("orientation", "vertical")
        compact.style.cssText = [
          "display:block",
          "width:100%",
          "height:100%",
          "margin:0",
          "padding:0",
          "border:none",
          "background:transparent",
          "color-scheme:dark",
          "overflow:hidden",
        ].join(";")

        const request = document.createElement("gmp-place-details-place-request")
        request.setAttribute("place", placeId)

        const config = document.createElement("gmp-place-content-config")
        // Solo media + atribución (requisito Places UI Kit)
        config.appendChild(document.createElement("gmp-place-media"))
        const attribution = document.createElement("gmp-place-attribution")
        attribution.setAttribute("light-scheme-color", "gray")
        attribution.setAttribute("dark-scheme-color", "white")
        config.appendChild(attribution)

        compact.append(request, config)
        compact.addEventListener("gmp-error", onError)
        compact.addEventListener("gmp-load", onLoad)
        hostRef.current.appendChild(compact)

        // Timeout suave: si no carga, fallback visual del padre
        window.setTimeout(() => {
          if (!cancelled) {
            setStatus((s) => (s === "loading" ? "error" : s))
          }
        }, 12000)
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()

    return () => {
      cancelled = true
      host.replaceChildren()
    }
  }, [placeId])

  if (status === "error") {
    return (
      <div
        className={cn(
          "h-full w-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent",
          className
        )}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#0a0f0c]", className)}
      // Evita que el Link padre capture clicks de atribución Google
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent" />
      )}
      <div
        ref={hostRef}
        className="absolute inset-0 [&_gmp-place-details-compact]:h-full [&_gmp-place-details-compact]:w-full"
        aria-label="Foto de Google Places"
      />
    </div>
  )
}
