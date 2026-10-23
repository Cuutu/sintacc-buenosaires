"use client"

import { PlaceNameWithBranch } from "@/components/places/BranchName"
import * as React from "react"
import { PlaceImage } from "@/components/place-image"
import Link from "next/link"
import { ArrowRight, Check, ExternalLink, Info, Navigation, Share2, Star, X } from "lucide-react"
import type { IPlace } from "@/models/Place"
import { cn } from "@/lib/utils"
import { FavoriteButton } from "@/components/favorite-button"
import { getPlaceImageUrl } from "@/lib/place-image"
import { getOpenStatusLabel } from "@/lib/opening-hours"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
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
import { animateSpring, EASE_OUT, MOTION_MS } from "./motion"
import { trackEvent } from "@/lib/analytics"
import { recordCommitment } from "@/lib/analytics-discovery"
import { TrackPlaceDwell } from "@/components/analytics/TrackPlaceDwell"
import { toast } from "sonner"

export const MOBILE_SHEET_COMPACT_PX = 196
export const MOBILE_SHEET_EXPANDED_PX = 320
export const CLOSE_THRESHOLD_PX = 72
export const CAMERA_SHEET_GAP_PX = 8

export type PlaceSheetSnap = "compact" | "expanded"

const RUBBER_PX = 24
const COMPACT_Y = MOBILE_SHEET_EXPANDED_PX - MOBILE_SHEET_COMPACT_PX
const HIDDEN_Y = MOBILE_SHEET_EXPANDED_PX
const EXPANDED_Y = 0
const ENTER_FROM_Y = COMPACT_Y + Math.round(MOBILE_SHEET_EXPANDED_PX * 0.24)

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
  const [snap, setSnap] = React.useState<PlaceSheetSnap>("expanded")
  const expanded = snap === "expanded"
  const onSnapChangeRef = React.useRef(onSnapChange)
  onSnapChangeRef.current = onSnapChange
  const reduceMotionRef = React.useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  React.useEffect(() => {
    const placeId = String(place._id)
    trackEvent("place_view", {
      placeId,
      surface: "map_sheet",
      placeName: place.name,
    })
  }, [place._id, place.name])

  const stopSpring = React.useCallback(() => {
    stopSpringRef.current?.()
    stopSpringRef.current = null
  }, [])

  const setYImmediate = React.useCallback((y: number, opacity?: number) => {
    const el = sheetRef.current
    if (el) {
      el.style.transition = "none"
      el.style.transform = `translate3d(0, ${y}px, 0)`
      if (opacity != null) el.style.opacity = String(opacity)
    }
    translateYRef.current = y
  }, [])

  const transitionTo = React.useCallback(
    (y: number, duration: number, opacity: number, onComplete?: () => void) => {
      const el = sheetRef.current
      if (!el) {
        onComplete?.()
        return
      }
      if (reduceMotionRef.current) {
        setYImmediate(y, opacity)
        onComplete?.()
        return
      }
      el.style.transition = `transform ${duration}ms ${EASE_OUT}, opacity ${duration}ms ${EASE_OUT}`
      el.style.transform = `translate3d(0, ${y}px, 0)`
      el.style.opacity = String(opacity)
      translateYRef.current = y
      const done = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") return
        el.removeEventListener("transitionend", done)
        onComplete?.()
      }
      el.addEventListener("transitionend", done)
    },
    [setYImmediate]
  )

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
    setSnap("expanded")
    onSnapChangeRef.current?.("expanded")
    if (reduceMotion) {
      setYImmediate(EXPANDED_Y, 1)
      return
    }
    setYImmediate(ENTER_FROM_Y, 0)
    const id = window.requestAnimationFrame(() => {
      transitionTo(EXPANDED_Y, MOTION_MS.sheet, 1)
    })
    return () => window.cancelAnimationFrame(id)
  }, [place._id, reduceMotion, setYImmediate, stopSpring, transitionTo])

  React.useEffect(() => () => stopSpring(), [stopSpring])

  const closeSheet = React.useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (reduceMotion) {
      onClose()
      return
    }
    transitionTo(ENTER_FROM_Y, MOTION_MS.close, 0, onClose)
  }, [onClose, reduceMotion, transitionTo])

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
    if ((event.target as HTMLElement).closest("[data-directions],[data-favorite],[data-google-maps],[data-sheet-action]")) return
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
  const openLabel = getOpenStatusLabel(place.openingHours)
  const openNow = openLabel != null && openLabel !== "Cerrado"
  const detailTags = getPlaceSheetDetailTags(place.tags)
  const placeId = String(place._id)
  const onPhoto = Boolean(photoSrc)
  const coverInk = onPhoto ? "#FFFFFF" : cover.ink
  const lightInk = coverInk !== "#2D4A34"
  const nameSize =
    place.name.length > 30 ? "text-[21px]" : place.name.length > 18 ? "text-[25px]" : "text-[30px]"

  const handleShare = async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${detailPath}`
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
    "pointer-events-auto relative z-[2] flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
    onPhoto
      ? "bg-black/35 text-white backdrop-blur-sm hover:bg-black/45 focus-visible:ring-white/70"
      : lightInk
        ? "bg-[#F7F3EB]/[0.14] text-[#F7F3EB] hover:bg-[#F7F3EB]/[0.22] focus-visible:ring-[#F7F3EB]/60"
        : "bg-[#2D4A34]/10 text-[#2D4A34] hover:bg-[#2D4A34]/[0.16] focus-visible:ring-[#2D4A34]/40"
  )

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 h-[320px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%-12px),transparent)]"
      data-overflow-allowed="decoration"
    >
      {expanded && (
        <TrackPlaceDwell
          placeId={placeId}
          properties={{
            surface: "map_sheet",
            placeName: place.name,
          }}
        />
      )}
      {/* Tarjeta flotante "Edición": portada + datos + acciones. Mide siempre lo mismo
          (la portada absorbe el espacio libre) para que el modo compacto muestre
          portada y tipo/barrio. */}
      <section
        ref={sheetRef}
        className="pointer-events-auto absolute inset-x-0 top-0 h-[320px] touch-none select-none px-3 pb-3"
        style={{ transform: `translate3d(0, ${ENTER_FROM_Y}px, 0)`, opacity: 0 }}
        aria-label={place.name}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <article className="relative flex h-full flex-col rounded-[28px] bg-white p-2.5 shadow-[0_24px_50px_-20px_rgba(31,42,34,0.55),0_0_0_1px_rgba(45,74,52,0.06)]">
          {/* touch-none + draggable=false: el gesto vertical mueve la tarjeta (si no, el
              navegador lo toma como scroll o arrastre del link y cancela el pointer). */}
          <Link
            href={detailPath}
            draggable={false}
            className="absolute inset-0 z-0 rounded-[28px]"
            aria-label={`Ver ${place.name}`}
            onClick={(event) => {
              if (draggedRef.current) event.preventDefault()
            }}
          />

          <div
            className={cn(
              "pointer-events-none relative z-[1] min-h-[112px] flex-1 overflow-hidden rounded-[22px]",
              !onPhoto && cover.texture
            )}
            style={onPhoto ? undefined : { backgroundColor: cover.bg }}
          >
            {photoSrc ? (
              <>
                <PlaceImage
                  src={photoSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 480px) 100vw, 480px"
                />
                <span
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,30,23,0.28)_0%,rgba(20,30,23,0)_34%,rgba(20,30,23,0.12)_52%,rgba(20,30,23,0.74)_100%)]"
                  aria-hidden
                />
              </>
            ) : null}

            <span
              className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: coverInk, opacity: 0.35 }}
              aria-hidden
            />

            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <span className="mt-1 inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-[#F7F3EB] px-2.5 text-[12px] font-black leading-none text-[#1F4D35] shadow-[0_4px_12px_-6px_rgba(20,30,23,0.45)]">
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
                  data-sheet-action="share"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleShare()
                  }}
                  aria-label="Compartir"
                  className={coverButtonClass}
                >
                  <Share2 className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                </button>
                <button
                  type="button"
                  data-sheet-action="close"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeSheet()
                  }}
                  aria-label="Cerrar"
                  className={coverButtonClass}
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
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
              <PlaceNameWithBranch place={place} />
            </h2>
          </div>

          <div className="pointer-events-none relative z-[1] shrink-0 px-1.5 pt-2.5">
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
                  <span
                    className={cn(
                      "shrink-0 font-bold",
                      openNow ? "text-[#1F4D35]" : "text-[#5E6A60]"
                    )}
                  >
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
                    className="pointer-events-auto relative z-[2] inline-flex min-w-0 items-center gap-1 underline decoration-[#5E6A60]/40 underline-offset-2"
                  >
                    <span className="min-w-0 truncate">{address}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                    <span className="sr-only">(abre Google Maps)</span>
                  </a>
                ) : null}
              </p>
            ) : null}

            {detailTags.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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

            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-[1.35] text-[#5E6A60] [text-wrap:pretty]">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Información de la comunidad. Confirmá siempre en el local.
            </p>

            <div className="mt-2.5 grid grid-cols-[46px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <div
                data-favorite="true"
                className="pointer-events-auto relative z-[2]"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <FavoriteButton
                  placeId={placeId}
                  className="h-[46px] w-[46px] rounded-[16px] border-[1.5px] border-[#DDD5C6] bg-white text-[#2D4A34] hover:bg-[#FBF8F1] hover:text-[#2D4A34]"
                />
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-directions="true"
                data-place-id={placeId}
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-auto relative z-[2] inline-flex h-[46px] min-w-0 items-center justify-center gap-1.5 rounded-[16px] border-[1.5px] border-[#DDD5C6] bg-white px-2 text-[14px] font-black text-[#2D4A34] transition-colors hover:bg-[#FBF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30 max-[359px]:px-1 max-[359px]:text-[13.5px]"
              >
                {/* En 320px el texto completo no entra con ícono: se va el ícono, no el texto. */}
                <Navigation className="h-4 w-4 shrink-0 max-[359px]:hidden" strokeWidth={2.1} aria-hidden />
                <span className="truncate">Cómo llegar</span>
              </a>
              <Link
                href={detailPath}
                draggable={false}
                onClick={(event) => {
                  if (draggedRef.current) event.preventDefault()
                }}
                className="pointer-events-auto relative z-[2] inline-flex h-[46px] min-w-0 items-center justify-center gap-1 rounded-[16px] bg-[#B84420] px-2 text-[14px] font-black text-white transition-colors hover:bg-[#A33B1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84420]/50 focus-visible:ring-offset-2 max-[359px]:px-1 max-[359px]:text-[13.5px]"
              >
                <span className="truncate">Ver ficha</span>
                <ArrowRight className="h-4 w-4 shrink-0 max-[359px]:hidden" strokeWidth={2.2} aria-hidden />
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
