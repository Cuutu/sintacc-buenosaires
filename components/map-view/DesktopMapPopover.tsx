"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Navigation, Share2 } from "lucide-react"
import type { IPlace } from "@/models/Place"
import type { MapboxMapRef } from "./MapboxMap"
import { computePopoverPlacement, type PopoverPlacement } from "./popover-placement"
import {
  formatShortPlaceAddress,
  getCanonicalPlaceArea,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceTypeLabel,
} from "./place-selected-card-model"
import { PlaceRatingRow, PlaceSafetyBadge, PlaceTypeGlyph } from "./PlaceCardBits"
import { trackEvent } from "@/lib/analytics"
import { recordCommitment } from "@/lib/analytics-discovery"
import { TrackPlaceDwell } from "@/components/analytics/TrackPlaceDwell"
import { FavoriteButton } from "@/components/favorite-button"
import { toast } from "sonner"

interface DesktopMapPopoverProps {
  place: IPlace
  mapRef: React.RefObject<MapboxMapRef | null>
  onClose: () => void
  closing?: boolean
}

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

    const bind = () => {
      if (cancelled) return
      const api = mapRef.current
      if (!api?.subscribeViewChange) {
        window.requestAnimationFrame(bind)
        return
      }
      update()
      stop = api.subscribeViewChange(update)
      if (cardRef.current) {
        observer = new ResizeObserver(update)
        observer.observe(cardRef.current)
      }
    }
    bind()
    return () => {
      cancelled = true
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

  const meta = [getPlaceTypeLabel(place), getCanonicalPlaceArea(place)].filter(Boolean).join(" • ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)

  const handleShare = async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${detailPath}`
    trackEvent("place_share", { placeId, surface: "map_sheet" })
    recordCommitment("place_share", placeId)
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
    } catch {
      // User cancelled
    }
  }

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
        className={`pointer-events-auto absolute z-30 w-[min(340px,calc(100%-24px))] overflow-visible ${
          closing ? "map-popover-leave" : "map-popover-enter"
        }`}
        style={
          placement
            ? { left: placement.left, top: placement.top }
            : { left: 16, top: 16, visibility: "hidden" }
        }
      >
      <div className="relative overflow-hidden rounded-[22px] border border-[var(--map-paper-border)] bg-[var(--map-paper-bg)] p-4 shadow-[0_12px_32px_-14px_rgba(45,74,52,0.22)]">
        <div className="pointer-events-none relative z-[1]">
          <div className="flex items-center justify-between gap-3">
            <PlaceSafetyBadge place={place} />
            <PlaceTypeGlyph place={place} />
          </div>
          <h2 className="mt-3 line-clamp-2 text-[20px] font-bold leading-[1.18] tracking-[-0.02em] text-[#1F4D35]">
            {place.name}
          </h2>
          {meta ? (
            <p className="mt-1 text-[13px] font-medium text-[#5F6B63]">{meta}</p>
          ) : null}
          {address ? (
            <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-snug text-[#5F6B63]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.85] text-[#1F4D35]" aria-hidden />
              <span className="line-clamp-1">{address}</span>
            </p>
          ) : null}
          <PlaceRatingRow place={place} className="mt-2.5" />
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="pointer-events-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#1F4D35]/20 bg-white/55 px-3.5 text-[12px] font-semibold tracking-[0.01em] text-[#1F4D35] hover:bg-[#1F4D35]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              >
                <Share2 className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                Compartir
              </button>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-directions="true"
                data-place-id={placeId}
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-auto relative z-[2] inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#1F4D35]/20 bg-white/55 px-3.5 text-[12px] font-semibold tracking-[0.01em] text-[#1F4D35] hover:bg-[#1F4D35]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              >
                <Navigation className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                Cómo llegar
              </a>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto"
            >
              <FavoriteButton
                placeId={placeId}
                className="h-10 w-10 text-[#1F4D35]"
              />
            </div>
          </div>
          <Link
            href={detailPath}
            className="pointer-events-auto mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#C85A2E] px-4 py-2.5 text-[13px] font-semibold tracking-[0.01em] text-white hover:bg-[#B64320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A2E]/50"
          >
            Ver ficha completa
            <ArrowRight className="h-4 w-4 stroke-[2]" aria-hidden />
          </Link>
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
    const base =
    "pointer-events-none absolute h-3.5 w-3.5 rotate-45 border-[var(--map-paper-border)] bg-[var(--map-paper-bg)]"
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
