"use client"

import { useState } from "react"
import { ImageUpload } from "@/components/image-upload"
import { cn } from "@/lib/utils"

export function AdminPhotoStudio({
  photos,
  onChange,
  compact = false,
}: {
  photos: string[]
  onChange: (urls: string[]) => void
  compact?: boolean
}) {
  const cover = photos[0]
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return
    const next = [...photos]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[24px] border border-[#E8E1D6] bg-[#F8F5EF]">
        <div className={cn("relative w-full overflow-hidden", compact ? "h-[240px]" : "aspect-[3/2]")}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Portada del lugar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 bg-[linear-gradient(160deg,#F8F5EF,#E8E1D6)]">
              <p className="font-display text-2xl font-extrabold text-[#234A33]">CeliMap</p>
              <p className="text-sm text-[#6B746C]">Todavía no hay foto</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-[#6B746C]">
        Esta imagen se usa en tarjetas, el mapa y los destacados. Hasta 3 fotos.
      </p>
      {photos.length > 0 ? (
        <div className="flex gap-2">
          {photos.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom == null) return
                move(dragFrom, index)
                setDragFrom(null)
              }}
              onClick={() => move(index, 0)}
              className={cn(
                "h-16 w-[5.3rem] overflow-hidden rounded-2xl border transition-colors duration-150",
                index === 0 ? "border-[#234A33]" : "border-[#E8E1D6]"
              )}
              aria-label={index === 0 ? "Foto de portada" : "Usar como portada"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {cover ? (
          <button
            type="button"
            onClick={() => onChange(photos.slice(1))}
            className="inline-flex h-11 items-center rounded-2xl border border-[#E8E1D6] px-4 text-sm font-semibold text-[#C85A2E]"
          >
            Eliminar
          </button>
        ) : null}
        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => move(0, 1)}
            className="inline-flex h-11 items-center rounded-2xl border border-[#E8E1D6] px-4 text-sm font-semibold text-[#234A33]"
          >
            Reordenar
          </button>
        ) : null}
      </div>
      <ImageUpload value={photos} onChange={onChange} maxCount={3} folder="places" />
    </div>
  )
}
