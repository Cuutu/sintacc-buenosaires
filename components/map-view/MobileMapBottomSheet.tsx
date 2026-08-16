"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Navigation } from "lucide-react"
import type { IPlace } from "@/models/Place"
import { cn } from "@/lib/utils"
import {
  formatShortPlaceAddress,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceTypeLabel,
} from "./place-selected-card-model"
import { PlaceRatingRow, PlaceSafetyBadge, PlaceTypeGlyph } from "./PlaceCardBits"

export const MOBILE_SHEET_COMPACT_PX = 132
const SHEET_EXPANDED_PX = 320
const CLOSE_THRESHOLD_PX = 72

interface MobileMapBottomSheetProps {
  place: IPlace
  onClose: () => void
  reduceMotion?: boolean
  onHeightChange?: (heightPx: number) => void
}

export function MobileMapBottomSheet({
  place,
  onClose,
  reduceMotion = false,
  onHeightChange,
}: MobileMapBottomSheetProps) {
  const [heightPx, setHeightPx] = React.useState(MOBILE_SHEET_COMPACT_PX)
  const [dragging, setDragging] = React.useState(false)
  const startY = React.useRef(0)
  const startH = React.useRef(MOBILE_SHEET_COMPACT_PX)
  const heightRef = React.useRef(heightPx)
  const draggedRef = React.useRef(false)
  heightRef.current = heightPx
  const expanded = heightPx > (MOBILE_SHEET_COMPACT_PX + SHEET_EXPANDED_PX) / 2

  React.useEffect(() => {
    setHeightPx(MOBILE_SHEET_COMPACT_PX)
  }, [place._id])

  React.useEffect(() => {
    onHeightChange?.(heightPx)
  }, [heightPx, onHeightChange])

  const snapTo = React.useCallback((next: number) => {
    if (next < CLOSE_THRESHOLD_PX) {
      onClose()
      return
    }
    const compactDist = Math.abs(next - MOBILE_SHEET_COMPACT_PX)
    const expandedDist = Math.abs(next - SHEET_EXPANDED_PX)
    setHeightPx(compactDist <= expandedDist ? MOBILE_SHEET_COMPACT_PX : SHEET_EXPANDED_PX)
  }, [onClose])

  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-directions]")) return
    draggedRef.current = false
    setDragging(true)
    startY.current = event.clientY
    startH.current = heightRef.current
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging) return
    const delta = startY.current - event.clientY
    if (Math.abs(delta) > 8) draggedRef.current = true
    const next = Math.max(0, Math.min(SHEET_EXPANDED_PX + 24, startH.current + delta))
    heightRef.current = next
    setHeightPx(next)
  }

  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    snapTo(heightRef.current)
  }

  const meta = [getPlaceTypeLabel(place), place.neighborhood].filter(Boolean).join(" • ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)

  return (
    <section
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 overflow-hidden rounded-t-[24px] border border-[#E8E1D6] border-b-0 bg-[#F8F5EF] shadow-[0_-12px_32px_rgba(31,77,53,0.12)]",
        !reduceMotion && !dragging && "transition-[height] duration-300 ease-out"
      )}
      style={{ height: heightPx }}
      aria-label={place.name}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="flex justify-center pb-1 pt-2.5">
        <span className="h-1 w-10 rounded-full bg-[#E8E1D6]" aria-hidden />
      </div>

      <div className="relative h-[calc(100%-18px)] overflow-hidden px-4 pb-3">
        <Link
          href={detailPath}
          className="absolute inset-0 z-0"
          aria-label={`Ver ${place.name}`}
          onClick={(event) => {
            if (draggedRef.current) event.preventDefault()
          }}
        />

        <div className="pointer-events-none relative z-[1]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PlaceSafetyBadge place={place} size="sm" />
                <PlaceRatingRow place={place} className="text-[12px]" />
              </div>
              <h2
                className={cn(
                  "mt-1.5 font-extrabold leading-[1.15] tracking-[-0.03em] text-[#1F4D35]",
                  expanded ? "line-clamp-2 text-[20px]" : "line-clamp-1 text-[16px]"
                )}
              >
                {place.name}
              </h2>
              {meta ? (
                <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#5F6B63]">{meta}</p>
              ) : null}
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-directions="true"
              onClick={(event) => event.stopPropagation()}
              className="pointer-events-auto relative z-[2] inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-2xl border border-[#1F4D35] bg-[#F8F5EF] px-3 text-[12.5px] font-extrabold text-[#1F4D35]"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Cómo llegar
            </a>
          </div>

          {expanded ? (
            <div className="mt-3">
              {address ? (
                <p className="flex items-start gap-2 text-[13px] leading-snug text-[#5F6B63]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1F4D35]" aria-hidden />
                  <span className="line-clamp-1">{address}</span>
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-between">
                <PlaceTypeGlyph place={place} />
                <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-[#C85A2E]">
                  Ver lugar
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
