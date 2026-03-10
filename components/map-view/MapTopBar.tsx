"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TYPES } from "@/lib/constants"

const TAG_CHIPS = [
  { id: "cocina_separada", label: "🍳 Cocina separada" },
  { id: "certificado_sin_tacc", label: "🛡 Certificado" },
  { id: "delivery", label: "🚗 Delivery" },
] as const

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
  /** overlay = sobre el mapa (mobile), sidebar = en el panel derecho (desktop) */
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
      ? filters.tags.filter((t) => t !== tagId)
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

  // Drag-to-scroll para chips (solo overlay/mobile)
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
  const handleChipsMouseUp = () => { isDraggingRef.current = false }
  const handleChipsMouseLeave = () => { isDraggingRef.current = false }
  const handleChipClick = (e: React.MouseEvent, tagId: string) => {
    if (didDragRef.current) { e.preventDefault(); return }
    toggleTag(tagId)
  }

  // ── SIDEBAR (desktop) ─────────────────────────────────────────────────────
  if (isSidebar) {
    return (
      <div className="border-b border-white/10 px-5 pt-4 pb-4 shrink-0 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 rounded-xl border-white/10 bg-black/40 backdrop-blur text-sm"
          />
        </div>

        {/* Safety pills */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Nivel de seguridad
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleSafety("dedicated_gf")}
              className={cn(
                "py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center",
                filters.safetyLevel === "dedicated_gf"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
              )}
            >
              ✅ 100% sin TACC
            </button>
            <button
              type="button"
              onClick={() => toggleSafety("gf_options")}
              className={cn(
                "py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center",
                filters.safetyLevel === "gf_options"
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
              )}
            >
              🟡 Tiene opciones
            </button>
          </div>
        </div>

        {/* Tipo */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Tipo de lugar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleType(type.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  filters.type === type.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                )}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags extra */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Características
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleTag(chip.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  filters.tags.includes(chip.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        {onSortChange && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Ordenar por
            </p>
            <div className="flex gap-1">
              {([
                { value: "default", label: "Relevancia" },
                { value: "rating", label: "★ Rating" },
                { value: "newest", label: "Nuevo" },
              ] as { value: SortOption; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSortChange(opt.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border transition-all",
                    sort === opt.value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── OVERLAY (mobile) — sin cambios respecto al original ───────────────────
  const MOBILE_CHIPS = [
    { id: "100_gf", label: "100% sin TACC" },
    { id: "opciones_sin_tacc", label: "Opciones sin TACC" },
    { id: "cocina_separada", label: "Cocina separada" },
    { id: "certificado_sin_tacc", label: "Certificado" },
    { id: "delivery", label: "Delivery" },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 pt-[env(safe-area-inset-top)] md:top-6 md:left-6 md:right-auto md:max-w-md md:rounded-2xl md:border md:border-white/10 md:px-5 md:pt-5 md:pb-4 md:shadow-xl md:shadow-black/30 md:border-white/20 md:pt-5 px-4 pt-3 pb-2 bg-black/40 backdrop-blur-md">
      <div className="flex gap-2 mb-3 md:mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-12 min-h-[44px] text-base rounded-xl border-white/10 bg-black/40 backdrop-blur md:bg-white/5 md:border-white/20"
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
        onMouseLeave={handleChipsMouseLeave}
        className="flex overflow-x-auto gap-2 scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 md:gap-3 select-none cursor-grab active:cursor-grabbing"
      >
        {MOBILE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={(e) => handleChipClick(e, chip.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium min-h-[44px] shrink-0 snap-center transition-colors",
              filters.tags.includes(chip.id)
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 border border-white/10 hover:bg-white/15"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
