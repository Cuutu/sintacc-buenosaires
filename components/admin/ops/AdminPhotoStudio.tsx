"use client"

import { useState } from "react"
import { ImageUpload } from "@/components/image-upload"
import { cn } from "@/lib/utils"

export function AdminPhotoStudio({
  photos,
  onChange,
  compact = false,
  folder = "places",
}: {
  photos: string[]
  onChange: (urls: string[]) => void
  compact?: boolean
  /** Carpeta de subida (places | ventures). */
  folder?: string
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

  // En los modales (compact) la portada ya se ve en la vista previa de la derecha:
  // acá solo van las fotos, sin el recuadro grande vacío de 240 px.
  if (compact) {
    return (
      <section className="space-y-3 rounded-2xl border border-line bg-cream-card p-4" aria-label="Fotos">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-olive">Fotos</p>
          <p className="text-xs text-ink-muted">
            {photos.length} de 3 · la primera es la portada (tarjetas, mapa y destacados)
          </p>
        </div>
        {photos.length > 1 ? (
          <div>
            <p className="mb-2 text-xs text-ink-muted">Tocá una foto o arrastrala para que sea la portada.</p>
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
                    "relative h-14 w-20 overflow-hidden rounded-xl border-2 transition-colors duration-150",
                    index === 0 ? "border-olive" : "border-transparent"
                  )}
                  aria-label={index === 0 ? "Foto de portada" : `Usar la foto ${index + 1} como portada`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute inset-x-0 bottom-0 bg-olive/80 text-center text-[10px] font-semibold text-cream">
                      Portada
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <ImageUpload value={photos} onChange={onChange} maxCount={3} folder={folder} />
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[24px] border border-line bg-cream">
        <div className={cn("relative w-full overflow-hidden", compact ? "h-[240px]" : "aspect-[3/2]")}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Portada del lugar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-cream to-line">
              <p className="font-display text-2xl font-extrabold text-olive">CeliMap</p>
              <p className="text-sm text-ink-muted">Todavía no hay foto</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-muted">
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
                index === 0 ? "border-olive" : "border-line"
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
            className="inline-flex h-11 items-center rounded-2xl border border-line px-4 text-sm font-semibold text-terracotta-strong"
          >
            Eliminar
          </button>
        ) : null}
        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => move(0, 1)}
            className="inline-flex h-11 items-center rounded-2xl border border-line px-4 text-sm font-semibold text-olive"
          >
            Reordenar
          </button>
        ) : null}
      </div>
      <ImageUpload value={photos} onChange={onChange} maxCount={3} folder={folder} />
    </div>
  )
}
