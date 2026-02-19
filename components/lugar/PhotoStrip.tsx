"use client"

import Image from "next/image"
import { MessageCircle } from "lucide-react"
import { TYPES } from "@/lib/constants"

interface PhotoStripProps {
  photos?: string[]
  name: string
  type?: string
  types?: string[]
}

function CategoryBadge({ type, types }: { type?: string; types?: string[] }) {
  const displayTypes = types?.length ? types : type ? [type] : []
  if (displayTypes.length === 0) return null
  const primaryType = displayTypes[0]
  const label = TYPES.find((c) => c.value === primaryType)?.label || primaryType

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/90 text-sm font-medium mt-2">
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
      {label}
    </span>
  )
}

export function PhotoStrip({ photos, name, type, types }: PhotoStripProps) {
  const typeConfig = TYPES.find((t) => t.value === type) || TYPES[0]

  if (!photos || photos.length === 0) {
    return (
      <div>
        <div className="relative aspect-[4/3] md:aspect-square w-full max-h-[200px] md:max-h-none rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-emerald-950/80 via-emerald-900/50 to-emerald-950/80 flex items-center justify-center">
          <span className="text-6xl md:text-7xl opacity-60" aria-hidden>
            {typeConfig?.emoji || "📍"}
          </span>
        </div>
        <CategoryBadge type={type} types={types} />
      </div>
    )
  }

  return (
    <div>
      <div className="relative w-full aspect-[4/3] md:aspect-square max-h-[200px] md:max-h-none rounded-2xl overflow-hidden border border-white/5">
        <Image
          src={photos[0]}
          alt={`${name} - foto principal`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 40vw"
          priority
        />
      </div>
      <CategoryBadge type={type} types={types} />
    </div>
  )
}
