"use client"

import { MapPin } from "lucide-react"

type Props = {
  lat: number
  lng: number
  address?: string
  onAdjust?: () => void
}

export function LocationPinPreview({ lat, lng, address, onAdjust }: Props) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const mapsHref = `https://www.google.com/maps?q=${lat},${lng}&z=16`
  const embedSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=es&output=embed`

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <div className="relative h-44 w-full">
        <iframe
          title={address ? `Mapa: ${address}` : "Ubicación en Google Maps"}
          src={embedSrc}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="line-clamp-1">{address || "Ubicación pineada"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {onAdjust && (
            <button
              type="button"
              onClick={onAdjust}
              className="font-medium text-primary hover:underline"
            >
              Ajustar pin
            </button>
          )}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Abrir Maps
          </a>
        </span>
      </div>
    </div>
  )
}
