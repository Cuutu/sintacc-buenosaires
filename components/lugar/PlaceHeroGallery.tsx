"use client"

import Image from "next/image"
import { TYPES } from "@/lib/constants"

interface PlaceHeroGalleryProps {
  photos?: string[]
  name: string
  type?: string
  types?: string[]
  safetyDot?: string
  safetyLabel?: string
}

export function PlaceHeroGallery({
  photos,
  name,
  type,
  types,
  safetyDot,
  safetyLabel,
}: PlaceHeroGalleryProps) {
  const primaryType = types?.[0] ?? type ?? "other"
  const typeConfig = TYPES.find((t) => t.value === primaryType)

  const hasPhotos = photos && photos.length > 0

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/8 bg-white/5">
      {/* Grid de fotos */}
      {hasPhotos ? (
        <div
          className={
            photos.length === 1
              ? "grid grid-cols-1"
              : photos.length === 2
              ? "grid grid-cols-2 gap-0.5"
              : "grid grid-cols-2 gap-0.5"
          }
          style={{ height: 320 }}
        >
          {/* Foto principal */}
          <div
            className={
              photos.length >= 3
                ? "relative row-span-2"
                : "relative"
            }
          >
            <Image
              src={photos[0]}
              alt={`${name} - foto 1`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          {/* Fotos secundarias */}
          {photos.length >= 2 && (
            <div className="relative">
              <Image
                src={photos[1]}
                alt={`${name} - foto 2`}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          )}
          {photos.length >= 3 && (
            <div className="relative">
              <Image
                src={photos[2]}
                alt={`${name} - foto 3`}
                fill
                className="object-cover"
                sizes="25vw"
              />
              {/* Overlay si hay más fotos */}
              {photos.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    +{photos.length - 3} fotos
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Placeholder sin fotos
        <div
          className="flex items-center justify-center bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-slate-900/80"
          style={{ height: 320 }}
        >
          <span className="text-8xl opacity-40" aria-hidden>
            {typeConfig?.emoji ?? "📍"}
          </span>
        </div>
      )}

      {/* Safety badge flotante sobre la foto */}
      {safetyLabel && (
        <div className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <span className="text-sm">{safetyDot}</span>
          {safetyLabel}
        </div>
      )}

      {/* Contador fotos */}
      {hasPhotos && photos.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-muted-foreground">
          📷 {photos.length} fotos
        </div>
      )}
    </div>
  )
}
