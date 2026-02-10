"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  icon: LucideIcon
  title: string
  value: number | null
  /** Ej: "locales", "experiencias", "usuarios" */
  valueLabel: string
  /** Valor formateado para display, ej: "128" o "+1.200" */
  displayValue?: string
  subtext: string
  chips?: string[]
  isLoading?: boolean
}

export function StatCard({
  icon: Icon,
  title,
  value,
  valueLabel,
  displayValue,
  subtext,
  chips = [],
  isLoading = false,
}: StatCardProps) {
  const isEmpty = value === null || (value === 0 && !isLoading)
  const showPlaceholder = value === 0 && !isLoading

  return (
    <article
      className={cn(
        "group relative min-h-[200px] flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6",
        "transition-all duration-300 ease-out",
        "hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5",
        "focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-background"
      )}
    >
      {/* Glow sutil top-left */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col flex-1 min-h-0">
        {/* Header: icon + title */}
        <header className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400/90"
            aria-hidden
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </div>
          <h3 className="text-sm font-medium text-white/90">{title}</h3>
        </header>

        {/* Centro: número (protagonista) */}
        <div className="flex-1 flex flex-col justify-center py-2">
          {isLoading ? (
            <div className="h-10 w-24 animate-pulse rounded bg-white/10" aria-hidden />
          ) : showPlaceholder ? (
            <div className="space-y-1">
              <span className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums text-white/40">
                —
              </span>
              <p className="text-xs text-white/50">Inicializando datos</p>
            </div>
          ) : (
            <p
              className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums text-emerald-400"
              style={{
                textShadow: "0 0 40px rgba(16, 185, 129, 0.08)",
              }}
            >
              {displayValue ?? value?.toLocaleString("es-AR")} {valueLabel}
            </p>
          )}
        </div>

        {/* Footer: subtexto + chips */}
        <footer className="mt-auto pt-4 space-y-2">
          <p className="text-xs text-white/60 truncate">{subtext}</p>
          {chips.length > 0 && !isEmpty && (
            <div className="inline-flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 text-[11px] font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </footer>
      </div>
    </article>
  )
}
