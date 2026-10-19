"use client"

import * as React from "react"
import { PlaceImage } from "@/components/place-image"
import Link from "next/link"
import { ArrowRight, Check, ExternalLink, Info, Navigation, Share2, Star, X } from "lucide-react"
import type { IPlace } from "@/models/Place"
import type { MapboxMapRef } from "./MapboxMap"
import { computePopoverPlacement, type PopoverPlacement } from "./popover-placement"
import {
  formatShortPlaceAddress,
  getCanonicalPlaceArea,
  getPlaceCardRating,
  getPlaceCoverTheme,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceGoogleMapsUrl,
  getPlaceSafety,
  getPlaceSheetDetailTags,
  getPlaceTypeLabel,
} from "./place-selected-card-model"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getPlaceImageUrl } from "@/lib/place-image"
import { getOpenStatusLabel } from "@/lib/opening-hours"
import { trackEvent } from "@/lib/analytics"
import { recordCommitment } from "@/lib/analytics-discovery"
import { TrackPlaceDwell } from "@/components/analytics/TrackPlaceDwell"
import { FavoriteButton } from "@/components/favorite-button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DesktopMapPopoverProps {
  place: IPlace
  mapRef: React.RefObject<MapboxMapRef | null>
  onClose: () => void
  closing?: boolean
}

/** Misma tarjeta "Edición" que en el celular, anclada al pin. */
export function DesktopMapPopover({ place, mapRef, onClose, closing = false }: DesktopMapPopoverProps) {
  const cardRef = React.useRef<HTMLElement>(null)
  const [placement, setPlacement] = React.useState<PopoverPlacement | null>(null)

  const placeId = String(place._id)

  React.useEffect(() => {
    trackEvent("place_view", {
      placeId,
      surface: "map_sheet",
      placeName: place.name,
    })
  }, [placeId, place.name])

  const update = React.useCallback(() => {
    const lng = place.location?.lng
    const lat = place.location?.lat
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    const point = mapRef.current?.projectLngLat(lng as number, lat as number)
    const size = mapRef.current?.getContainerSize()
    const card = cardRef.current
    if (!point || !size || !card) return
    setPlacement(
      computePopoverPlacement({
        anchorX: point.x,
        anchorY: point.y,
        cardW: card.offsetWidth,
        cardH: card.offsetHeight,
        containerW: size.width,
        containerH: size.height,
      })
    )
  }, [mapRef, place.location?.lat, place.location?.lng])

  React.useEffect(() => {
    let stop: (() => void) | undefined
    let observer: ResizeObserver | undefined
    let cancelled = false
    let frame = 0

    // Mover el mapa avisa en cada `move`: se reubica una vez por cuadro, en el siguiente
    // requestAnimationFrame, y no en medio del render de Mapbox.
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (!cancelled) update()
      })
    }

    const bind = () => {
      if (cancelled) return
      const api = mapRef.current
      if (!api?.subscribeViewChange) {
        window.requestAnimationFrame(bind)
        return
      }
      update()
      stop = api.subscribeViewChange(scheduleUpdate)
      if (cardRef.current) {
        observer = new ResizeObserver(scheduleUpdate)
        observer.observe(cardRef.current)
      }
    }
    bind()
    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      stop?.()
      observer?.disconnect()
    }
  }, [mapRef, update])

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const onPointerDown = (event: PointerEvent) => {
      const node = cardRef.current
      if (!node || node.contains(event.target as Node)) return
      const canvas = document.querySelector(".mapboxgl-canvas")
      if (canvas && canvas.contains(event.target as Node)) return
      onClose()
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [onClose])

  const meta = [getPlaceTypeLabel(place), getCanonicalPlaceArea(place)].filter(Boolean).join(" · ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)
  const googleMapsUrl = getPlaceGoogleMapsUrl(place)
  const photoSrc = getPlaceImageUrl(place.photos?.[0], "popup")
  const safety = getPlaceSafety(place)
  const safetyLevel = inferSafetyLevel(place) ?? "unknown"
  const cover = getPlaceCoverTheme(place)
  const rating = getPlaceCardRating(place)
  // El popover sólo existe después de un click (nunca en el HTML del servidor).
  const openLabel = getOpenStatusLabel(place.openingHours)
  const openNow = openLabel != null && openLabel !== "Cerrado"
  const detailTags = getPlaceSheetDetailTags(place.tags)
  const onPhoto = Boolean(photoSrc)
  const coverInk = onPhoto ? "#FFFFFF" : cover.ink
  const lightInk = coverInk !== "#2D4A34"
  const nameSize =
    place.name.length > 34 ? "text-[22px]" : place.name.length > 20 ? "text-[26px]" : "text-[31px]"

  const handleShare = async () => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${detailPath}`
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
      trackEvent("place_share", { placeId, surface: "map_sheet" })
      recordCommitment("place_share", placeId)
    } catch {
      // User cancelled
    }
  }

  const coverButtonClass = cn(
    "pointer-events-auto relative z-[2] flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
    onPhoto
      ? "bg-black/35 text-white backdrop-blur-sm hover:bg-black/50 focus-visible:ring-white/70"
      : lightInk
        ? "bg-[#F7F3EB]/[0.14] text-[#F7F3EB] hover:bg-[#F7F3EB]/[0.24] focus-visible:ring-[#F7F3EB]/60"
        : "bg-[#2D4A34]/10 text-[#2D4A34] hover:bg-[#2D4A34]/[0.16] focus-visible:ring-[#2D4A34]/40"
  )

  return (
    <>
      {placement !== null && (
        <TrackPlaceDwell
          placeId={placeId}
          properties={{
            surface: "map_sheet",
            placeName: place.name,
          }}
        />
      )}
      <article
        ref={cardRef}
        role="dialog"
        aria-label={place.name}
        className={`pointer-events-auto absolute z-30 w-[min(360px,calc(100%-24px))] overflow-visible ${
          closing ? "map-popover-leave" : "map-popover-enter"
        }`}
        style={
          placement
            ? { left: placement.left, top: placement.top }
            : { left: 16, top: 16, visibility: "hidden" }
        }
      >
        <div className="relative rounded-[28px] bg-white p-2 shadow-[0_28px_60px_-24px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)]">
          {/* Toda la tarjeta lleva a la ficha; los botones van por encima. */}
          <Link
            href={detailPath}
            className="absolute inset-0 z-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30"
            aria-label={`Ver ${place.name}`}
          />

          <div
            className={cn(
              "pointer-events-none relative z-[1] h-[156px] overflow-hidden rounded-[21px]",
              !onPhoto && cover.texture
            )}
            style={onPhoto ? undefined : { backgroundColor: cover.bg }}
          >
            {photoSrc ? (
              <>
                <PlaceImage src={photoSrc} alt="" fill className="object-cover" sizes="360px" />
                <span
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,30,23,0.3)_0%,rgba(20,30,23,0)_34%,rgba(20,30,23,0.1)_52%,rgba(20,30,23,0.74)_100%)]"
                  aria-hidden
                />
              </>
            ) : null}

            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-[#F7F3EB] px-2.5 text-[12px] font-black leading-none text-[#1F4D35] shadow-[0_4px_12px_-6px_rgba(20,30,23,0.45)]">
                {safetyLevel === "dedicated_gf" ? (
                  <Check className="h-3 w-3 shrink-0" strokeWidth={3.2} aria-hidden />
                ) : (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: safety.accent }}
                    aria-hidden
                  />
                )}
                <span className="truncate">{safety.label}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleShare()
                  }}
                  aria-label="Compartir"
                  title="Compartir"
                  className={coverButtonClass}
                >
                  <Share2 className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose()
                  }}
                  aria-label="Cerrar"
                  title="Cerrar (Esc)"
                  className={coverButtonClass}
                >
                  <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            </div>

            <h2
              className={cn(
                "absolute inset-x-4 bottom-3 line-clamp-2 font-serif font-medium italic leading-[1.0] tracking-[-0.02em]",
                nameSize,
                onPhoto && "[text-shadow:0_1px_12px_rgba(0,0,0,0.35)]"
              )}
              style={{ color: coverInk }}
            >
              {place.name}
            </h2>
          </div>

          <div className="pointer-events-none relative z-[1] px-2 pb-1 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[14.5px] font-extrabold text-[#2D4A34]">
                {meta || "Lugar"}
              </p>
              {rating ? (
                <p
                  className="flex shrink-0 items-center gap-1 text-[14.5px] font-black text-[#2D4A34]"
                  title={rating.label}
                >
                  <Star className="h-3.5 w-3.5 fill-[#B84420] text-[#B84420]" aria-hidden />
                  <span aria-hidden>{rating.score}</span>
                  <span className="text-[11.5px] font-bold text-[#5E6A60]" aria-hidden>
                    {rating.source}
                  </span>
                  <span className="sr-only">{rating.label}</span>
                </p>
              ) : null}
            </div>

            {openLabel || address ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#5E6A60]">
                {openLabel ? (
                  <span className={cn("shrink-0 font-bold", openNow ? "text-[#1F4D35]" : "text-[#5E6A60]")}>
                    {openLabel}
                  </span>
                ) : null}
                {openLabel && address ? <span aria-hidden>·</span> : null}
                {address ? (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-google-maps="true"
                    title="Abrir en Google Maps"
                    onClick={(event) => event.stopPropagation()}
                    className="pointer-events-auto relative z-[2] inline-flex min-w-0 items-center gap-1 underline decoration-[#5E6A60]/40 underline-offset-2 hover:text-[#2D4A34]"
                  >
                    <span className="min-w-0 truncate">{address}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                    <span className="sr-only">(abre Google Maps)</span>
                  </a>
                ) : null}
              </p>
            ) : null}

            {detailTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detailTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex h-[22px] items-center rounded-full bg-[#F1ECE2] px-2 text-[11px] font-bold text-[#2D4A34]"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-[1.35] text-[#5E6A60] [text-wrap:pretty]">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Información de la comunidad. Confirmá siempre en el local.
            </p>

            <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <div
                className="pointer-events-auto relative z-[2]"
                onClick={(event) => event.stopPropagation()}
              >
                <FavoriteButton
                  placeId={placeId}
                  className="h-11 w-11 rounded-[15px] border-[1.5px] border-[#DDD5C6] bg-white text-[#2D4A34] hover:bg-[#FBF8F1] hover:text-[#2D4A34]"
                />
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-directions="true"
                data-place-id={placeId}
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-auto relative z-[2] inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[15px] border-[1.5px] border-[#DDD5C6] bg-white px-2 text-[14px] font-black text-[#2D4A34] transition-colors hover:bg-[#FBF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30"
              >
                <Navigation className="h-4 w-4 shrink-0" strokeWidth={2.1} aria-hidden />
                <span className="truncate">Cómo llegar</span>
              </a>
              <Link
                href={detailPath}
                className="pointer-events-auto relative z-[2] inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-[15px] bg-[#B84420] px-2 text-[14px] font-black text-white transition-colors hover:bg-[#A33B1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84420]/50 focus-visible:ring-offset-2"
              >
                <span className="truncate">Ver ficha</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
        {placement ? <PopoverArrow side={placement.side} x={placement.arrowX} y={placement.arrowY} /> : null}
      </article>
    </>
  )
}

function PopoverArrow({
  side,
  x,
  y,
}: {
  side: PopoverPlacement["side"]
  x: number
  y: number
}) {
  const base = "pointer-events-none absolute h-3.5 w-3.5 rotate-45 border-[rgba(45,74,52,0.07)] bg-white"
  if (side === "top") {
    return (
      <span
        aria-hidden
        className={`${base} border-b border-r`}
        style={{ left: x - 7, bottom: -6 }}
      />
    )
  }
  if (side === "bottom") {
    return (
      <span
        aria-hidden
        className={`${base} border-l border-t`}
        style={{ left: x - 7, top: -6 }}
      />
    )
  }
  if (side === "right") {
    return (
      <span
        aria-hidden
        className={`${base} border-b border-l`}
        style={{ left: -6, top: y - 7 }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`${base} border-r border-t`}
      style={{ right: -6, top: y - 7 }}
    />
  )
}
