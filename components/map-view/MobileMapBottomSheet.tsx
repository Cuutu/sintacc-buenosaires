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
export const MOBILE_SHEET_EXPANDED_PX = 320
export const CLOSE_THRESHOLD_PX = 72
export const CAMERA_SHEET_GAP_PX = 8

export type PlaceSheetSnap = "compact" | "expanded"

const RUBBER_PX = 24
const SNAP_MS = 300
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const COMPACT_Y = MOBILE_SHEET_EXPANDED_PX - MOBILE_SHEET_COMPACT_PX
const HIDDEN_Y = MOBILE_SHEET_EXPANDED_PX
const EXPANDED_Y = 0

interface MobileMapBottomSheetProps {
  place: IPlace
  onClose: () => void
  reduceMotion?: boolean
  onSnapChange?: (snap: PlaceSheetSnap) => void
}

function yForSnap(snap: PlaceSheetSnap): number {
  return snap === "expanded" ? EXPANDED_Y : COMPACT_Y
}

function clampY(next: number): number {
  return Math.max(-RUBBER_PX, Math.min(HIDDEN_Y, next))
}

export function MobileMapBottomSheet({
  place,
  onClose,
  reduceMotion = false,
  onSnapChange,
}: MobileMapBottomSheetProps) {
  const sheetRef = React.useRef<HTMLElement>(null)
  const translateYRef = React.useRef(HIDDEN_Y)
  const startYRef = React.useRef(0)
  const startTranslateRef = React.useRef(COMPACT_Y)
  const draggingRef = React.useRef(false)
  const draggedRef = React.useRef(false)
  const enteredRef = React.useRef(false)
  const closingRef = React.useRef(false)
  const [snap, setSnap] = React.useState<PlaceSheetSnap>("compact")
  const expanded = snap === "expanded"
  const onSnapChangeRef = React.useRef(onSnapChange)
  onSnapChangeRef.current = onSnapChange

  const applyY = React.useCallback((y: number, withTransition: boolean) => {
    const el = sheetRef.current
    if (!el) return
    const animate = withTransition && !reduceMotion
    el.style.transition = animate ? `transform ${SNAP_MS}ms ${SNAP_EASE}` : "none"
    el.style.transform = `translate3d(0, ${y}px, 0)`
    translateYRef.current = y
  }, [reduceMotion])

  React.useLayoutEffect(() => {
    closingRef.current = false
    setSnap("compact")
    onSnapChangeRef.current?.("compact")
    if (reduceMotion) {
      applyY(COMPACT_Y, false)
      enteredRef.current = true
      return
    }
    if (!enteredRef.current) {
      applyY(HIDDEN_Y, false)
      const id = window.requestAnimationFrame(() => {
        applyY(COMPACT_Y, true)
        enteredRef.current = true
      })
      return () => window.cancelAnimationFrame(id)
    }
    applyY(COMPACT_Y, true)
  }, [place._id, reduceMotion, applyY])

  const closeSheet = React.useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (reduceMotion) {
      onClose()
      return
    }
    const el = sheetRef.current
    applyY(HIDDEN_Y, true)
    if (!el) {
      onClose()
      return
    }
    const finish = (event?: TransitionEvent) => {
      if (event && event.propertyName !== "transform") return
      el.removeEventListener("transitionend", finish)
      window.clearTimeout(timeout)
      onClose()
    }
    const timeout = window.setTimeout(() => finish(), SNAP_MS + 80)
    el.addEventListener("transitionend", finish)
  }, [applyY, onClose, reduceMotion])

  const snapTo = React.useCallback((y: number) => {
    const visible = MOBILE_SHEET_EXPANDED_PX - y
    if (visible < CLOSE_THRESHOLD_PX) {
      closeSheet()
      return
    }
    const compactDist = Math.abs(y - COMPACT_Y)
    const expandedDist = Math.abs(y - EXPANDED_Y)
    const next: PlaceSheetSnap = compactDist <= expandedDist ? "compact" : "expanded"
    setSnap(next)
    applyY(yForSnap(next), true)
    onSnapChangeRef.current?.(next)
  }, [applyY, closeSheet])

  const onPointerDown = (event: React.PointerEvent) => {
    if (closingRef.current) return
    if ((event.target as HTMLElement).closest("[data-directions]")) return
    draggedRef.current = false
    draggingRef.current = true
    startYRef.current = event.clientY
    startTranslateRef.current = translateYRef.current
    applyY(translateYRef.current, false)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return
    const delta = event.clientY - startYRef.current
    if (Math.abs(delta) > 8) draggedRef.current = true
    applyY(clampY(startTranslateRef.current + delta), false)
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    snapTo(translateYRef.current)
  }

  const meta = [getPlaceTypeLabel(place), place.neighborhood].filter(Boolean).join(" • ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 h-[320px] overflow-hidden"
      data-overflow-allowed="decoration"
    >
      <section
        ref={sheetRef}
        className="map-paper pointer-events-auto absolute inset-x-0 top-0 h-[320px] overflow-hidden rounded-t-[24px] border border-[var(--map-paper-border)] border-b-0 motion-reduce:transition-none"
        style={{ transform: `translate3d(0, ${HIDDEN_Y}px, 0)` }}
        aria-label={place.name}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center pb-1.5 pt-2.5">
          <span className="map-handle" aria-hidden />
        </div>

        <div className="relative h-[calc(100%-22px)] overflow-hidden px-5 pb-3">
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
                <h2
                  className={cn(
                    "font-bold leading-[1.18] tracking-[-0.02em] text-[#1F4D35]",
                    expanded ? "line-clamp-2 text-[20px]" : "line-clamp-1 text-[16px]"
                  )}
                >
                  {place.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PlaceSafetyBadge place={place} size="sm" />
                  <PlaceRatingRow place={place} className="text-[12px]" />
                </div>
                {meta ? (
                  <p className="mt-1 truncate text-[12.5px] font-medium text-[#5F6B63]">{meta}</p>
                ) : null}
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-directions="true"
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-auto relative z-[2] inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#1F4D35]/20 bg-white/55 px-3.5 text-[12px] font-semibold tracking-[0.01em] text-[#1F4D35]"
              >
                <Navigation className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                Cómo llegar
              </a>
            </div>

            {expanded ? (
              <div className="mt-3 border-t border-[#1F4D35]/[0.06] pt-3">
                {address ? (
                  <p className="flex items-start gap-2 text-[13px] leading-snug text-[#5F6B63]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.85] text-[#1F4D35]" aria-hidden />
                    <span className="line-clamp-1">{address}</span>
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <PlaceTypeGlyph place={place} />
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tracking-[0.01em] text-[#C85A2E]">
                    Ver lugar
                    <ArrowRight className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
