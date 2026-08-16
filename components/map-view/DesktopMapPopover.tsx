"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Navigation } from "lucide-react"
import type { IPlace } from "@/models/Place"
import type { MapboxMapRef } from "./MapboxMap"
import { computePopoverPlacement, type PopoverPlacement } from "./popover-placement"
import {
  formatShortPlaceAddress,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceTypeLabel,
} from "./place-selected-card-model"
import { PlaceRatingRow, PlaceSafetyBadge, PlaceTypeGlyph } from "./PlaceCardBits"

interface DesktopMapPopoverProps {
  place: IPlace
  mapRef: React.RefObject<MapboxMapRef | null>
  onClose: () => void
}

export function DesktopMapPopover({ place, mapRef, onClose }: DesktopMapPopoverProps) {
  const cardRef = React.useRef<HTMLElement>(null)
  const [placement, setPlacement] = React.useState<PopoverPlacement | null>(null)

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

  const meta = [getPlaceTypeLabel(place), place.neighborhood].filter(Boolean).join(" • ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)

  return (
    <article
      ref={cardRef}
      role="dialog"
      aria-label={place.name}
      className="pointer-events-auto absolute z-30 w-[min(340px,calc(100%-24px))] overflow-visible"
      style={
        placement
          ? { left: placement.left, top: placement.top }
          : { left: 16, top: 16, visibility: "hidden" }
      }
    >
      <div className="relative overflow-hidden rounded-[22px] border border-[#E8E1D6] bg-[#F8F5EF] p-4 shadow-[0_12px_32px_rgba(31,77,53,0.14)]">
        <Link
          href={detailPath}
          className="absolute inset-0 z-0 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A2E]/50"
          aria-label={`Ver ${place.name}`}
        />
        <div className="pointer-events-none relative z-[1]">
          <div className="flex items-center justify-between gap-3">
            <PlaceSafetyBadge place={place} />
            <PlaceTypeGlyph place={place} />
          </div>
          <h2 className="mt-3 line-clamp-2 text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#1F4D35]">
            {place.name}
          </h2>
          {meta ? (
            <p className="mt-1 text-[13px] font-medium text-[#5F6B63]">{meta}</p>
          ) : null}
          {address ? (
            <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-snug text-[#5F6B63]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1F4D35]" aria-hidden />
              <span className="line-clamp-1">{address}</span>
            </p>
          ) : null}
          <PlaceRatingRow place={place} className="mt-2.5" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-[#C85A2E]">
              Ver lugar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-directions="true"
              onClick={(event) => event.stopPropagation()}
              className="pointer-events-auto relative z-[2] inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#1F4D35] bg-[#F8F5EF] px-3 text-[13px] font-extrabold text-[#1F4D35] hover:bg-[#1F4D35]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Cómo llegar
            </a>
          </div>
        </div>
      </div>
      {placement ? <PopoverArrow side={placement.side} x={placement.arrowX} y={placement.arrowY} /> : null}
    </article>
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
    "pointer-events-none absolute h-3.5 w-3.5 rotate-45 border-[#E8E1D6] bg-[#F8F5EF]"
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
