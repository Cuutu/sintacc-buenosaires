"use client"

const ITEMS = [
  { color: "#10d98a", label: "100% sin TACC" },
  { color: "#f6b33d", label: "Tiene opciones" },
  { color: "#6b7280", label: "Sin información" },
] as const

/** Leyenda de referencia (no interactiva) sobre el mapa. */
export function MapLegend() {
  return (
    <div
      role="note"
      aria-label="Referencia de colores del mapa"
      className="pointer-events-none absolute bottom-[calc(var(--bottom-nav-clearance)+1.5rem)] left-3 z-20 w-[min(210px,calc(100vw-1.5rem))] rounded-2xl border border-olive/15 bg-cream/92 p-3 shadow-soft backdrop-blur-md md:bottom-5 md:left-5"
      data-overflow-allowed="decoration"
    >
      <p className="mb-2.5 text-[11px] font-bold tracking-wide text-olive">Referencia</p>
      <ul className="space-y-2.5">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-[12px] font-medium leading-none text-olive/80">
            <span
              className="relative flex h-5 w-5 shrink-0 items-center justify-center"
              aria-hidden
            >
              <span
                className="absolute inset-0 rounded-full opacity-35"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="relative h-3 w-3 rounded-full ring-2 ring-cream"
                style={{ backgroundColor: item.color }}
              />
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
