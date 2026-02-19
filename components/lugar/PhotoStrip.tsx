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
      <div className="relative aspect-[4/3] md:aspect-square w-full max-h-[200px] md:max-h-none rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-emerald-950/80 via-emerald-900/50 to-emerald-950/80 flex items-center justify-center">
        <span className="text-6xl md:text-7xl opacity-60" aria-hidden>
          {typeConfig?.emoji || "📍"}
        </span>
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {displayTypes.map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-full bg-background/80 text-sm font-medium inline-flex"
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
    <div className="relative w-full aspect-[4/3] md:aspect-square max-h-[200px] md:max-h-none rounded-2xl overflow-hidden border border-white/5">
      <Image
        src={photos[0]}
        alt={`${name} - foto principal`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 40vw"
        priority
      />
      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
        {displayTypes.map((t) => (
          <span
            key={t}
            className="px-3 py-1.5 rounded-full bg-background/90 text-sm font-medium inline-flex"
          >
            {TYPES.find((c) => c.value === t)?.emoji}{" "}
            {TYPES.find((c) => c.value === t)?.label || t}
          </span>
        ))}
      </div>
    </div>
  )
}
