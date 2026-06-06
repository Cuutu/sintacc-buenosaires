"use client"

import * as React from "react"
import { Search, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TYPES } from "@/lib/constants"

const TAG_CHIPS = [
  { id: "cocina_separada", label: "Cocina separada" },
  { id: "certificado_sin_tacc", label: "Certificado" },
  { id: "delivery", label: "Delivery" },
] as const

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Otro",
}

export interface MapFilters {
  search: string
  tags: string[]
  type?: string
  neighborhood?: string
  safetyLevel?: string
}

export type SortOption = "default" | "rating" | "newest"

interface MapTopBarProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  onSearchChange: (search: string) => void
  onFiltersOpen?: () => void
  placeholder?: string
  sort?: SortOption
  onSortChange?: (sort: SortOption) => void
  variant?: "overlay" | "sidebar"
}

export function MapTopBar({
  filters,
  onFiltersChange,
  onSearchChange,
  onFiltersOpen,
  placeholder = "Buscar lugares...",
  sort = "default",
  onSortChange,
  variant = "overlay",
}: MapTopBarProps) {
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)
  const didDragRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)
  const isSidebar = variant === "sidebar"

  const toggleTag = (tagId: string) => {
    const tags = filters.tags.includes(tagId)
      ? filters.tags.filter((tag) => tag !== tagId)
      : [...filters.tags, tagId]
    onFiltersChange({ ...filters, tags })
  }

  const toggleType = (typeValue: string) => {
    onFiltersChange({
      ...filters,
      type: filters.type === typeValue ? undefined : typeValue,
    })
  }

  const toggleSafety = (level: string) => {
    onFiltersChange({
      ...filters,
      safetyLevel: filters.safetyLevel === level ? undefined : level,
    })
  }

  const handleChipsMouseDown = (e: React.MouseEvent) => {
    if (!chipsRef.current) return
    isDraggingRef.current = true
    didDragRef.current = false
    startXRef.current = e.pageX
    scrollLeftRef.current = chipsRef.current.scrollLeft
  }

  const handleChipsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !chipsRef.current) return
    const dx = Math.abs(e.pageX - startXRef.current)
    if (dx > 5) didDragRef.current = true
    if (didDragRef.current) {
      e.preventDefault()
      chipsRef.current.scrollLeft = scrollLeftRef.current - (e.pageX - startXRef.current) * 1.2
    }
  }

  const handleChipsMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleChipClick = (e: React.MouseEvent, tagId: string) => {
    if (didDragRef.current) {
      e.preventDefault()
      return
    }
    toggleTag(tagId)
  }

  if (isSidebar) {
    return (
      <div className="shrink-0 border-b border-white/10 px-5 pb-4 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
          <Input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-2xl border-white/10 bg-white/[0.035] pl-10 text-sm text-white placeholder:text-white/34 focus-visible:ring-primary/60"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { value: "dedicated_gf", label: "100% sin TACC", tone: "primary" },
            { value: "gf_options", label: "Tiene opciones", tone: "amber" },
          ].map((item) => {
            const active = filters.safetyLevel === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleSafety(item.value)}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition",
                  active && item.tone === "primary" && "border-primary/55 bg-primary/15 text-primary shadow-[0_0_18px_rgba(16,185,129,0.16)]",
                  active && item.tone === "amber" && "border-amber-400/45 bg-amber-400/12 text-amber-300",
                  !active && "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white/78"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Tipo de lugar
            </p>
            {onFiltersOpen && (
              <button
                type="button"
                onClick={onFiltersOpen}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/52"
              >
                <SlidersHorizontal className="h-3 w-3" />
                Más
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleType(type.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  filters.type === type.value
                    ? "border-primary/55 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white/78"
                )}
              >
                {TYPE_LABELS[type.value] ?? type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Características
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleTag(chip.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  filters.tags.includes(chip.id)
                    ? "border-primary/55 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white/78"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {onSortChange && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Ordenar
            </p>
            <div className="flex rounded-full border border-white/10 bg-white/[0.035] p-1">
              {([
                { value: "default", label: "Relevancia" },
                { value: "rating", label: "Rating" },
                { value: "newest", label: "Nuevo" },
              ] as { value: SortOption; label: string }[]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition",
                    sort === option.value
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-white/52 hover:text-white/78"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const mobileChips = [
    { id: "100_gf", label: "100% sin TACC" },
    { id: "opciones_sin_tacc", label: "Opciones sin TACC" },
  ]

  return (
    <div className="fixed left-3 right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 mx-auto max-w-[440px] rounded-[1.65rem] border border-white/20 bg-[#080c0f]/60 px-3 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:left-6 md:right-auto md:top-6 md:max-w-md">
      <div className="mb-2.5 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/50" />
          <input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex h-11 min-h-[44px] w-full rounded-[1.25rem] border border-white/10 pl-11 pr-4 text-base outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{
              backgroundColor: "rgba(8, 12, 15, 0.78)",
              color: "#f4fff9",
              WebkitTextFillColor: "#f4fff9",
              caretColor: "#10b981",
            }}
          />
        </div>
      </div>

      <div
        ref={chipsRef}
        role="region"
        aria-label="Filtros de búsqueda"
        onMouseDown={handleChipsMouseDown}
        onMouseMove={handleChipsMouseMove}
        onMouseUp={handleChipsMouseUp}
        onMouseLeave={handleChipsMouseUp}
        className="scrollbar-hide -mx-1 flex cursor-grab select-none snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 active:cursor-grabbing"
      >
        {mobileChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={(e) => handleChipClick(e, chip.id)}
            className={cn(
              "min-h-[38px] shrink-0 snap-center rounded-full border px-3.5 py-2 text-sm font-semibold transition-all active:scale-95",
              filters.tags.includes(chip.id)
                ? "border-primary/50 bg-primary/[0.18] text-primary shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                : "border-white/10 bg-white/[0.08] text-white/85 hover:bg-white/[0.14] hover:text-white"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
