"use client"

/** Leyenda discreta sobre el mapa (desktop/mobile). */
export function MapLegend() {
  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 z-10 hidden rounded-xl border border-white/12 bg-[#080c0f]/82 px-3 py-2 text-[11px] text-white/75 shadow-lg backdrop-blur-md md:block"
      aria-label="Leyenda del mapa"
    >
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10d98a] ring-1 ring-white/30" />
          100% sin TACC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1a6b4a] ring-1 ring-white/30" />
          Tiene opciones
        </span>
      </div>
    </div>
  )
}
