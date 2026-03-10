"use client"

import Image from "next/image"
import { TYPES } from "@/lib/constants"

interface PlaceHeroGalleryProps {
  photos?: string[]
  name: string
  type?: string
  types?: string[]
  safetyDot: string
  safetyLabel: string
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
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/8 bg-white/5 mb-4">
      {hasPhotos ? (
        <div
          className="grid gap-0.5"
          style={{
            height: 280,
            gridTemplateColumns: photos.length === 1 ? "1fr" : "1.6fr 1fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {/* Foto principal — ocupa las 2 filas */}
          <div
            className="relative overflow-hidden"
            style={{ gridRow: photos.length >= 2 ? "1 / 3" : "1 / 2" }}
          >
            <Image
              src={photos[0]}
              alt={`${name} - foto 1`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </div>
          {/* Foto 2 */}
          {photos.length >= 2 && (
            <div className="relative overflow-hidden">
              <Image
                src={photos[1]}
                alt={`${name} - foto 2`}
                fill
                className="object-cover"
                sizes="30vw"
              />
            </div>
          )}
          {/* Foto 3 — con overlay si hay más */}
          {photos.length >= 3 && (
            <div className="relative overflow-hidden">
              <Image
                src={photos[2]}
                alt={`${name} - foto 3`}
                fill
                className="object-cover"
                sizes="30vw"
              />
              {photos.length > 3 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold font-mono">
                    +{photos.length - 3} fotos
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Placeholder sin fotos */
        <div
          className="flex items-center justify-center bg-gradient-to-br from-emerald-950/80 via-emerald-900/30 to-slate-900/80"
          style={{ height: 280 }}
        >
          <span className="text-8xl opacity-30" aria-hidden>
            {typeConfig?.emoji ?? "📍"}
          </span>
        </div>
      )}

      {/* Safety badge flotante — siempre visible */}
      <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 bg-black/78 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
        <span className="text-xs leading-none">{safetyDot}</span>
        {safetyLabel}
      </div>

      {/* Contador fotos */}
      {hasPhotos && photos.length > 1 && (
        <div className="absolute bottom-3 right-3 z-10 bg-black/60 backdrop-blur border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 font-mono">
          📷 {photos.length}
        </div>
      )}
    </div>
  )
}
