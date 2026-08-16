"use client"

import { cn } from "@/lib/utils"

const ITEMS = [
  { color: "#1F4D35", label: "100% sin TACC" },
  { color: "#C85A2E", label: "Tiene opciones" },
  { color: "#CFC9BF", label: "Sin información" },
] as const

/** Leyenda compacta — debajo de filtros, no caja flotante. */
export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="Referencia de colores del mapa"
      className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1", className)}
    >
      {ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-olive/75">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-[#F6F1E8]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
