"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MapPin, Navigation } from "lucide-react"
import type { IPlace } from "@/models/Place"
import { cn } from "@/lib/utils"
import { FavoriteButton } from "@/components/favorite-button"
import { getPlaceImageUrl } from "@/lib/place-image"
import { getOpenStatusLabel } from "@/lib/opening-hours"
import {
  formatShortPlaceAddress,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceSheetDetailTags,
  getPlaceTypeKey,
  getPlaceTypeLabel,
} from "./place-selected-card-model"
import { PLACE_TYPE_ICONS, PlaceRatingRow, PlaceSafetyBadge } from "./PlaceCardBits"
import { animateSpring } from "./motion"

export const MOBILE_SHEET_COMPACT_PX = 168
export const MOBILE_SHEET_EXPANDED_PX = 320
export const CLOSE_THRESHOLD_PX = 72
export const CAMERA_SHEET_GAP_PX = 8

export type PlaceSheetSnap = "compact" | "expanded"

const RUBBER_PX = 24
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
  const closingRef = React.useRef(false)
  const velocityRef = React.useRef(0)
  const lastMoveRef = React.useRef({ t: 0, y: 0 })
  const stopSpringRef = React.useRef<(() => void) | null>(null)
  const [snap, setSnap] = React.useState<PlaceSheetSnap>("compact")
  const expanded = snap === "expanded"
  const onSnapChangeRef = React.useRef(onSnapChange)
  onSnapChangeRef.current = onSnapChange
  const reduceMotionRef = React.useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  const stopSpring = React.useCallback(() => {
    stopSpringRef.current?.()
    stopSpringRef.current = null
  }, [])

  const setYImmediate = React.useCallback((y: number) => {
    const el = sheetRef.current
    if (el) {
      el.style.transition = "none"
      el.style.transform = `translate3d(0, ${y}px, 0)`
    }
    translateYRef.current = y
  }, [])

  const springTo = React.useCallback(
    (y: number, velocity = 0, onComplete?: () => void) => {
      stopSpring()
      if (reduceMotionRef.current) {
        setYImmediate(y)
        onComplete?.()
        return
      }
      stopSpringRef.current = animateSpring({
        from: translateYRef.current,
        to: y,
        velocity,
        reduceMotion: false,
        onUpdate: setYImmediate,
        onComplete: () => {
          stopSpringRef.current = null
          onComplete?.()
        },
      })
    },
    [setYImmediate, stopSpring]
  )

  React.useLayoutEffect(() => {
    closingRef.current = false
    stopSpring()
    setSnap("compact")
    onSnapChangeRef.current?.("compact")
    if (reduceMotion) {
      setYImmediate(COMPACT_Y)
      return
    }
    setYImmediate(HIDDEN_Y)
    const id = window.requestAnimationFrame(() => {
      springTo(COMPACT_Y)
    })
    return () => window.cancelAnimationFrame(id)
  }, [place._id, reduceMotion, setYImmediate, springTo, stopSpring])

  React.useEffect(() => () => stopSpring(), [stopSpring])

  const closeSheet = React.useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (reduceMotion) {
      onClose()
      return
    }
    springTo(HIDDEN_Y, velocityRef.current, onClose)
  }, [onClose, reduceMotion, springTo])

  const snapTo = React.useCallback((y: number, velocity = 0) => {
    const visible = MOBILE_SHEET_EXPANDED_PX - y
    if (visible < CLOSE_THRESHOLD_PX) {
      closeSheet()
      return
    }
    const compactDist = Math.abs(y - COMPACT_Y)
    const expandedDist = Math.abs(y - EXPANDED_Y)
    const next: PlaceSheetSnap = compactDist <= expandedDist ? "compact" : "expanded"
    setSnap(next)
    springTo(yForSnap(next), velocity)
    onSnapChangeRef.current?.(next)
  }, [closeSheet, springTo])

  const onPointerDown = (event: React.PointerEvent) => {
    if (closingRef.current) return
    if ((event.target as HTMLElement).closest("[data-directions],[data-favorite]")) return
    draggedRef.current = false
    draggingRef.current = true
    stopSpring()
    startYRef.current = event.clientY
    startTranslateRef.current = translateYRef.current
    velocityRef.current = 0
    lastMoveRef.current = { t: performance.now(), y: translateYRef.current }
    setYImmediate(translateYRef.current)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return
    const delta = event.clientY - startYRef.current
    if (Math.abs(delta) > 8) draggedRef.current = true
    const nextY = clampY(startTranslateRef.current + delta)
    const now = performance.now()
    const dt = (now - lastMoveRef.current.t) / 1000
    if (dt > 0 && dt < 0.08) {
      velocityRef.current = (nextY - lastMoveRef.current.y) / dt
    }
    lastMoveRef.current = { t: now, y: nextY }
    setYImmediate(nextY)
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const stale = performance.now() - lastMoveRef.current.t > 80
    snapTo(translateYRef.current, stale ? 0 : velocityRef.current)
  }

  const meta = [getPlaceTypeLabel(place), place.neighborhood].filter(Boolean).join(" · ")
  const address = formatShortPlaceAddress(place)
  const detailPath = getPlaceDetailPath(place)
  const directionsUrl = getPlaceDirectionsUrl(place)
  const photoSrc = getPlaceImageUrl(place.photos?.[0], "thumb")
  const TypeIcon = PLACE_TYPE_ICONS[getPlaceTypeKey(place)] ?? MapPin
  const openLabel = getOpenStatusLabel(place.openingHours)
  const openNow = openLabel != null && openLabel !== "Cerrado"
  const detailTags = getPlaceSheetDetailTags(place.tags)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 h-[320px] overflow-hidden"
      data-overflow-allowed="decoration"
    >
      <section
        ref={sheetRef}
        className="map-paper pointer-events-auto absolute inset-x-0 top-0 h-[320px] overflow-hidden rounded-t-[24px] border border-[var(--map-paper-border)] border-b-0"
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

        <div className="relative h-[calc(100%-22px)] overflow-hidden px-4 pb-3">
          <Link
            href={detailPath}
            className="absolute inset-0 z-0"
            aria-label={`Ver ${place.name}`}
            onClick={(event) => {
              if (draggedRef.current) event.preventDefault()
            }}
          />

          <div className="pointer-events-none relative z-[1] flex items-start gap-3">
            <span className="relative mt-0.5 h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px] bg-[#1F4D35]/[0.08]">
              {photoSrc ? (
                <Image
                  src={photoSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[#1F4D35]" aria-hidden>
                  <TypeIcon className="h-6 w-6 stroke-[1.85]" />
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2
                  className={cn(
                    "min-w-0 font-bold leading-[1.18] tracking-[-0.02em] text-[#1F4D35]",
                    expanded ? "line-clamp-2 text-[18px]" : "line-clamp-1 text-[16px]"
                  )}
                >
                  {place.name}
                </h2>
                <div
                  data-favorite="true"
                  className="pointer-events-auto relative z-[2] -mr-1 -mt-1 shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <FavoriteButton
                    placeId={String(place._id)}
                    className="h-9 w-9 text-[#1F4D35]/70"
                  />
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <PlaceSafetyBadge place={place} size="sm" />
                <PlaceRatingRow place={place} className="text-[12px]" />
              </div>
              {meta ? (
                <p className="mt-1 truncate text-[12.5px] font-medium text-[#5F6B63]">{meta}</p>
              ) : null}
              {address ? (
                <p className="mt-0.5 truncate text-[12px] text-[#5F6B63]/90">{address}</p>
              ) : null}
              {detailTags.length > 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  {detailTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5F6B63]"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1F4D35]/35" aria-hidden />
                      {tag.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-1 flex items-center justify-between gap-2">
                {openLabel ? (
                  <p
                    className={cn(
                      "min-w-0 truncate text-[12px] font-semibold",
                      openNow ? "text-[#1F4D35]" : "text-[#5F6B63]"
                    )}
                  >
                    {openLabel}
                  </p>
                ) : (
                  <span />
                )}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-directions="true"
                  onClick={(event) => event.stopPropagation()}
                  className="pointer-events-auto relative z-[2] inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-[#1F4D35]/20 bg-white/55 px-2.5 text-[11px] font-semibold tracking-[0.01em] text-[#1F4D35]"
                >
                  <Navigation className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                  Cómo llegar
                </a>
              </div>
            </div>
          </div>

          {expanded ? (
            <div className="pointer-events-none relative z-[1] mt-3 border-t border-[#1F4D35]/[0.06] pt-3">
              <div className="flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tracking-[0.01em] text-[#C85A2E]">
                  Ver lugar
                  <ArrowRight className="h-3.5 w-3.5 stroke-[1.85]" aria-hidden />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
