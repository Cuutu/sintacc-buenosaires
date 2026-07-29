"use client"

/** Leyenda de referencia (no interactiva) sobre el mapa. */
export function MapLegend() {
  return (
    <div
      role="note"
      aria-label="Referencia de colores del mapa"
      className="pointer-events-none absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 z-10 max-w-[min(220px,calc(100vw-1.5rem))] rounded-2xl border border-white/14 bg-[#080c0f]/90 px-3 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)] backdrop-blur-md md:bottom-4 md:left-4"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">
        Referencia
      </p>
      <ul className="space-y-2 text-[11px] leading-none text-white/85">
        <li className="flex items-center gap-2.5">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#10d98a] shadow-[0_0_0_2px_rgba(255,255,255,0.35)]"
            aria-hidden
          />
          <span>100% sin TACC</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#f6b33d] shadow-[0_0_0_2px_rgba(255,255,255,0.35)]"
            aria-hidden
          />
          <span>Tiene opciones</span>
        </li>
      </ul>
    </div>
  )
}
