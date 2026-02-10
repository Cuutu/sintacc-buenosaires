"use client"

import Image from "next/image"
import { TYPES } from "@/lib/constants"

interface PhotoStripProps {
  photos?: string[]
  name: string
  type?: string
  types?: string[]
}

export function PhotoStrip({ photos, name, type, types }: PhotoStripProps) {
  const displayTypes = types?.length ? types : type ? [type] : []
  const typeConfig = TYPES.find((t) => t.value === type) || TYPES[0]

  if (!photos || photos.length === 0) {
    return (
      <div className="relative aspect-[4/3] md:aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <span className="text-8xl" aria-hidden>
          {typeConfig?.emoji || "📍"}
        </span>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {displayTypes.map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-full bg-background/90 text-sm font-medium min-h-[44px] inline-flex items-center"
            >
              {TYPES.find((c) => c.value === t)?.emoji}{" "}
              {TYPES.find((c) => c.value === t)?.label || t}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
      <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="relative w-[min(85vw,320px)] aspect-[4/3] shrink-0 snap-center rounded-2xl overflow-hidden"
          >
            <Image
              src={photo}
              alt={`${name} - foto ${idx + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 85vw, 320px"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
