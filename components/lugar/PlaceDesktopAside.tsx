"use client"

import { Clock, Info } from "lucide-react"
import { PlacePrimaryActions } from "./PlacePrimaryActions"
import { PlaceReportCard } from "./PlaceReportCard"
import { useOpenNowLine } from "./PlaceOpenNowLine"
import { hasInterpretableOpeningHours } from "@/lib/opening-hours"

interface PlaceDesktopAsideProps {
  mapsUrl: string
  placeId: string
  name: string
  shareUrl: string
  openingHours?: string
  onReportSuccess?: () => void
}

/**
 * Columna fija de la compu: acciones, estado de hoy y reporte. Dirección y teléfono
 * ya están en "Información", a la izquierda: no se repiten acá.
 */
export function PlaceDesktopAside({
  mapsUrl,
  placeId,
  name,
  shareUrl,
  openingHours,
  onReportSuccess,
}: PlaceDesktopAsideProps) {
  // Antes de montar: "Horarios" neutro (el estado depende de la hora y la ficha es ISR).
  const openNow = useOpenNowLine(openingHours)
  const showStatus = Boolean(openingHours) && hasInterpretableOpeningHours(openingHours)

  return (
    // self-stretch: el aside ocupa todo el alto de la fila, así la tarjeta de adentro
    // queda fija al bajar. Con items-start medía lo mismo que la tarjeta y no se pegaba.
    <aside className="hidden lg:block lg:self-stretch">
      <div className="sticky top-[calc(var(--desktop-nav-clearance)+1.5rem)] space-y-4">
        <div className="rounded-[26px] bg-white p-5 shadow-[0_20px_44px_-28px_rgba(31,42,34,0.45),0_0_0_1px_rgba(45,74,52,0.07)]">
          {showStatus ? (
            <div className="mb-4 flex items-start gap-3 border-b border-[#EFE9DE] pb-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#2D4A34]" aria-hidden />
              <div>
                <p
                  className={`text-base font-extrabold ${
                    !openNow ? "text-[#2D4A34]" : openNow.isOpen ? "text-[#2D7A4E]" : "text-[#8B5A3C]"
                  }`}
                >
                  {openNow ? openNow.label : "Horarios"}
                </p>
                {openNow?.detail && <p className="mt-0.5 text-sm text-[#5E6A60]">{openNow.detail}</p>}
              </div>
            </div>
          ) : null}

          <PlacePrimaryActions
            mapsUrl={mapsUrl}
            placeId={placeId}
            name={name}
            shareUrl={shareUrl}
          />

          <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-[#5E6A60] [text-wrap:pretty]">
            <Info className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Información de la comunidad. Confirmá siempre en el local.
          </p>
        </div>

        <PlaceReportCard placeId={placeId} onSuccess={onReportSuccess} />
      </div>
    </aside>
  )
}
