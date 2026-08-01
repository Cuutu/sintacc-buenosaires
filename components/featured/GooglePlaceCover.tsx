"use client"

import { useEffect, useRef, useState } from "react"
import { loadGoogleMapsBrowser } from "@/lib/google-maps-browser"
import { cn } from "@/lib/utils"

interface GooglePlaceCoverProps {
  placeId: string
  className?: string
  onStatusChange?: (status: "loading" | "ready" | "error") => void
}

/**
 * Portada Places UI Kit: media + nombre del widget + atribución.
 * Estilos de título solo vía CSS vars oficiales (--gmp-mat-*).
 */
export function GooglePlaceCover({
  placeId,
  className,
  onStatusChange,
}: GooglePlaceCoverProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const onStatusRef = useRef(onStatusChange)
  onStatusRef.current = onStatusChange

  useEffect(() => {
    onStatusRef.current?.("loading")
  }, [])

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host || !placeId) return

    const emit = (next: "loading" | "ready" | "error") => {
      if (cancelled) return
      setStatus(next)
      onStatusRef.current?.(next)
    }

    const onError = () => emit("error")
    const onLoad = () => emit("ready")

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
          "margin:0",
          "padding:0",
          "border:none",
          "background:transparent",
          "color-scheme:dark",
          "--gmp-mat-font-family:inherit",
          "--gmp-mat-font-title-small:700 1.125rem/1.35 inherit",
          "--gmp-mat-color-on-surface:#f8fafc",
          "--gmp-mat-color-surface:transparent",
          "--gmp-mat-color-on-surface-variant:rgba(248,250,252,0.72)",
        ].join(";")

        const request = document.createElement("gmp-place-details-place-request")
        request.setAttribute("place", placeId)

        const config = document.createElement("gmp-place-content-config")
        config.appendChild(document.createElement("gmp-place-media"))
        const attribution = document.createElement("gmp-place-attribution")
        attribution.setAttribute("light-scheme-color", "gray")
        attribution.setAttribute("dark-scheme-color", "white")
        config.appendChild(attribution)

        compact.append(request, config)
        compact.addEventListener("gmp-error", onError)
        compact.addEventListener("gmp-load", onLoad)
        hostRef.current.appendChild(compact)

        window.setTimeout(() => {
          if (!cancelled) {
            setStatus((s) => {
              if (s === "loading") {
                onStatusRef.current?.("error")
                return "error"
              }
              return s
            })
          }
        }, 12000)
      } catch {
        emit("error")
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
          "aspect-[4/3] w-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent",
          className
        )}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={cn("relative w-full bg-[#0a0f0c]", className)}
      // Solo frena el Link padre en controles Google (Maps / atribución).
      // El resto de la card sigue navegando al detalle (= Ver lugar).
      onClick={(e) => {
        const target = e.target as HTMLElement | null
        if (!target) return
        if (
          target.closest(
            "a, button, gmp-place-attribution, [role='button'], [href]"
          )
        ) {
          e.stopPropagation()
        }
      }}
    >
      {status === "loading" && (
        <div className="aspect-[4/3] w-full animate-pulse bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent" />
      )}
      <div
        ref={hostRef}
        className={cn(
          "w-full [&_gmp-place-details-compact]:w-full",
          status === "loading" && "absolute left-0 right-0 top-0 opacity-0 pointer-events-none"
        )}
        aria-label="Foto de Google Places"
      />
    </div>
  )
}
