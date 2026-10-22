"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/admin-format"

/**
 * Selector segmentado: pestañas de una pantalla (Catálogo / Cola) o una opción
 * entre pocas en un formulario (Publicado / Pendiente). Seleccionado = oliva lleno,
 * igual que los chips de filtro.
 */
export type SegmentOption<T extends string> = {
  value: T
  label: string
  count?: number | null
  /** Si está, el segmento es un link (pestañas que cambian la URL). */
  href?: string
}

const segmentClass = (selected: boolean) =>
  cn(
    "inline-flex h-11 min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40",
    selected ? "bg-olive text-cream" : "text-ink-muted hover:bg-cream hover:text-olive"
  )

function Count({ value, selected }: { value: number; selected: boolean }) {
  return (
    <span className={cn("text-xs font-semibold tabular-nums", selected ? "text-cream/80" : "text-ink-muted")}>
      {formatCount(value)}
    </span>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: Array<SegmentOption<T>>
  value: T
  onChange?: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-cream-card p-1", className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        const content = (
          <>
            {opt.label}
            {opt.count != null ? <Count value={opt.count} selected={selected} /> : null}
          </>
        )
        return opt.href ? (
          <Link
            key={opt.value}
            href={opt.href}
            aria-current={selected ? "page" : undefined}
            className={segmentClass(selected)}
          >
            {content}
          </Link>
        ) : (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange?.(opt.value)}
            className={segmentClass(selected)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
