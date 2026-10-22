import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/admin-format"

/**
 * Chip de filtro. Seleccionado = oliva lleno, en todo el admin (antes había cuatro
 * estilos: verde, terracota lleno, terracota claro y chips mini). Opcionalmente
 * muestra cuántos hay ("Sin foto · 1.830").
 */
export function filterChipClass(selected: boolean, className?: string) {
  return cn(
    "inline-flex h-11 min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40",
    selected ? "border-olive bg-olive text-cream" : "border-line bg-cream-card text-olive hover:bg-cream",
    className
  )
}

export function FilterChip({
  selected = false,
  count,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; count?: number | null }) {
  return (
    <button type={type} aria-pressed={selected} className={filterChipClass(selected, className)} {...props}>
      {children}
      {count != null ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs font-semibold tabular-nums",
            selected ? "bg-cream/20 text-cream" : "bg-olive/8 text-ink-muted"
          )}
        >
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  )
}
