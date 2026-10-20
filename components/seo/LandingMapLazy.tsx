"use client"

import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import type { LandingMapProps } from "@/components/seo/LandingMap"

const loadLandingMap = () => import("@/components/seo/LandingMap")

const LandingMap = dynamic(() => loadLandingMap().then((m) => m.LandingMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-[#F7F3EB]">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Cargando el mapa…
    </div>
  ),
})

/**
 * Caja del mapa de una landing. El mapa interactivo (Mapbox, ~430 KB) se baja
 * recién cuando la persona toca el botón; al pasar el mouse o apoyar el dedo ya
 * se empieza a bajar. Antes venía en el JS inicial de ciudad y provincia (~680 KB
 * en total). La caja tiene altura fija, así que no mueve el resto de la página.
 */
export function LandingMapLazy({ label, ...mapProps }: LandingMapProps & { label: string }) {
  const [open, setOpen] = useState(false)
  const prefetch = () => {
    void loadLandingMap()
  }

  return (
    // Celular: cerrado es una franja de 200 px (antes ~500, y los lugares quedaban muy
    // abajo); al abrirlo crece para poder usarlo. En compu, igual que antes.
    <div
      className={cn(
        "relative bg-[#2D4A34] md:h-[min(500px,70vh)] md:min-h-[360px]",
        open ? "h-[min(420px,65vh)]" : "h-[200px]"
      )}
    >
      {open ? (
        <LandingMap {...mapProps} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onPointerEnter={prefetch}
          onPointerDown={prefetch}
          onFocus={prefetch}
          className="group absolute inset-0 flex w-full flex-col items-center justify-center gap-3 bg-[url('/brand/hero/mapa-noche.svg')] bg-cover bg-center text-[#F7F3EB] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#D4633A]/60"
          data-testid="landing-map-open"
        >
          <span className="absolute inset-0 bg-[#2D4A34]/55 transition-colors group-hover:bg-[#2D4A34]/45" aria-hidden />
          <span className="relative inline-flex items-center gap-2 rounded-full bg-[#B84420] px-5 py-3 text-sm font-extrabold shadow-lg transition-transform group-hover:scale-[1.03]">
            <MapPin className="h-4 w-4" aria-hidden />
            {label}
          </span>
          <span className="relative text-xs font-semibold text-[#F7F3EB]/85">Mapa interactivo con los lugares de la zona</span>
        </button>
      )}
    </div>
  )
}
