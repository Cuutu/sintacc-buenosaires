"use client"

import * as React from "react"
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
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
  /** Contador visible en sidebar (ej. "208 lugares en esta zona") */
  resultCountLabel?: string
  onClearFilters?: () => void
  hasActiveFilters?: boolean
}

function FilterChip({
  active,
  label,
  onClick,
  onClear,
  tone = "primary",
  pressed,
}: {
  active: boolean
  label: string
  onClick: () => void
  onClear?: () => void
  tone?: "primary" | "amber" | "neutral"
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed ?? active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active && tone === "primary" && "border-primary bg-primary text-primary-foreground",
        active && tone === "amber" && "border-amber-400 bg-amber-400 text-amber-950",
        active && tone === "neutral" && "border-primary bg-primary text-primary-foreground",
        !active && "border-white/12 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
      )}
    >
      <span>{label}</span>
      {active && onClear && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="ml-0.5 inline-flex rounded-full p-0.5 opacity-80 hover:opacity-100"
          aria-hidden
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  )
}

export function MapTopBar({
  filters,
  onFiltersChange,
  onSearchChange,
  onFiltersOpen,
  placeholder = "Buscar lugar o zona...",
  sort = "default",
  onSortChange,
  variant = "overlay",
  resultCountLabel,
  onClearFilters,
  hasActiveFilters = false,
}: MapTopBarProps) {
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const moreRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)
  const didDragRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)
  const [moreOpen, setMoreOpen] = React.useState(false)
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

  React.useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [moreOpen])

  const moreActiveCount =
    (filters.type ? 1 : 0) +
    TAG_CHIPS.filter((c) => filters.tags.includes(c.id)).length

  if (isSidebar) {
    return (
      <div className="shrink-0 space-y-3 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" aria-hidden />
          <Input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar lugar o zona"
            className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-sm text-white placeholder:text-white/34 focus-visible:ring-primary/60"
          />
        </div>

        <div ref={moreRef} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filters.safetyLevel === "dedicated_gf"}
              label="100% sin TACC"
              tone="primary"
              onClick={() => toggleSafety("dedicated_gf")}
              onClear={() => toggleSafety("dedicated_gf")}
            />
            <FilterChip
              active={filters.safetyLevel === "gf_options"}
              label="Tiene opciones"
              tone="amber"
              onClick={() => toggleSafety("gf_options")}
              onClear={() => toggleSafety("gf_options")}
            />
            <FilterChip
              active={Boolean(filters.type)}
              label={filters.type ? TYPE_LABELS[filters.type] ?? "Tipo" : "Tipo de lugar"}
              tone="neutral"
              onClick={() => setMoreOpen(true)}
              onClear={
                filters.type
                  ? () => onFiltersChange({ ...filters, type: undefined })
                  : undefined
              }
            />
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="mapa-more-filters"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                moreActiveCount > 0 || moreOpen
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/12 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Más filtros
              {moreActiveCount > 0 && (
                <span className="rounded-full bg-black/20 px-1.5 text-[10px]">{moreActiveCount}</span>
              )}
            </button>
          </div>

          {/* Inline panel: evita corte por overflow del aside */}
          {moreOpen && (
            <div
              id="mapa-more-filters"
              role="region"
              aria-label="Más filtros"
              className="max-h-[min(50vh,360px)] overflow-y-auto rounded-2xl border border-white/12 bg-[#0c1014] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                  Tipo de lugar
                </p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar filtros"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleType(type.value)}
                    aria-pressed={filters.type === type.value}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      filters.type === type.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white/78"
                    )}
                  >
                    {TYPE_LABELS[type.value] ?? type.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-white/45">
                Características
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleTag(chip.id)}
                    aria-pressed={filters.tags.includes(chip.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      filters.tags.includes(chip.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/18 hover:text-white/78"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {(resultCountLabel || onSortChange || hasActiveFilters) && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="min-w-0 truncate text-sm text-white/62">
              {resultCountLabel}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {hasActiveFilters && onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs font-medium text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  Limpiar filtros
                </button>
              )}
              {onSortChange && (
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Ordenar resultados</span>
                  <select
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    className="h-9 appearance-none rounded-full border border-white/12 bg-white/[0.04] py-1.5 pl-3 pr-8 text-xs font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <option value="default">Recomendados</option>
                    <option value="rating">Mejor valorados</option>
                    <option value="newest">Más recientes</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-white/45" aria-hidden />
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mobile overlay: safety via tags (comportamiento actual) + más filtros abre panel
  const mobileSafetyChips = [
    { id: "100_gf", label: "100% sin TACC", safety: "dedicated_gf" as const },
    { id: "opciones_sin_tacc", label: "Tiene opciones", safety: "gf_options" as const },
  ]

  return (
    <div className="fixed left-3 right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 mx-auto max-w-[440px] rounded-[1.65rem] border border-white/20 bg-[#080c0f]/60 px-3 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:left-6 md:right-auto md:top-6 md:max-w-md">
      <div className="mb-2.5 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/50" aria-hidden />
          <input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar lugar o zona"
            className="flex h-11 min-h-[44px] w-full rounded-[1.25rem] border border-white/10 pl-11 pr-4 text-base outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{
              backgroundColor: "rgba(8, 12, 15, 0.78)",
              color: "#f4fff9",
              WebkitTextFillColor: "#f4fff9",
              caretColor: "#10b981",
            }}
          />
        </div>
        {onFiltersOpen && (
          <button
            type="button"
            onClick={onFiltersOpen}
            aria-label="Más filtros"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/12 bg-white/[0.08] text-white/85"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
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
        {mobileSafetyChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={(e) => handleChipClick(e, chip.id)}
            aria-pressed={filters.tags.includes(chip.id)}
            className={cn(
              "min-h-[38px] shrink-0 snap-center rounded-full border px-3.5 py-2 text-sm font-semibold transition-all active:scale-95",
              filters.tags.includes(chip.id)
                ? "border-primary bg-primary text-primary-foreground"
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
