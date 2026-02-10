"use client"

import * as React from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FILTER_CHIPS = [
  { id: "100_gf", label: "100% sin TACC" },
  { id: "opciones_sin_tacc", label: "Opciones sin TACC" },
  { id: "cocina_separada", label: "Cocina separada" },
  { id: "certificado_sin_tacc", label: "Certificado" },
  { id: "delivery", label: "Delivery" },
] as const

export interface MapFilters {
  search: string
  tags: string[]
  type?: string
  neighborhood?: string
  safetyLevel?: string
}

interface MapTopBarProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  onSearchChange: (search: string) => void
  onFiltersOpen?: () => void
  placeholder?: string
  /** overlay = sobre el mapa (mobile), sidebar = en el panel derecho (desktop) */
  variant?: "overlay" | "sidebar"
}

export function MapTopBar({
  filters,
  onFiltersChange,
  onSearchChange,
  onFiltersOpen,
  placeholder = "Buscar lugares...",
  variant = "overlay",
}: MapTopBarProps) {
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)
  const didDragRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)

  const toggleTag = (tagId: string) => {
    const tags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId]
    onFiltersChange({ ...filters, tags })
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
      const walk = (e.pageX - startXRef.current) * 1.2
      chipsRef.current.scrollLeft = scrollLeftRef.current - walk
    }
  }

  const handleChipsMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleChipsMouseLeave = () => {
    isDraggingRef.current = false
  }

  const handleChipClick = (e: React.MouseEvent, tagId: string) => {
    if (didDragRef.current) {
      e.preventDefault()
      return
    }
    toggleTag(tagId)
  }

  const isSidebar = variant === "sidebar"

  return (
    <div
      className={cn(
        "px-4 pt-3 pb-2 bg-black/40 backdrop-blur-md",
        isSidebar
          ? "border-b border-white/10 px-5 pt-4 pb-4 shrink-0"
          : "fixed top-16 left-0 right-0 z-30 border-b border-white/10 md:top-6 md:left-6 md:right-auto md:max-w-md md:rounded-2xl md:border md:border-white/10 md:px-5 md:pt-5 md:pb-4 md:shadow-xl md:shadow-black/30 md:border-white/20"
      )}
    >
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
        {onFiltersOpen && (
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 min-h-[44px] min-w-[44px] rounded-xl shrink-0 border-white/10"
            onClick={onFiltersOpen}
            aria-label="Filtros"
          >
            <Filter className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div
        ref={chipsRef}
        role="region"
        aria-label="Filtros de búsqueda"
        onMouseDown={handleChipsMouseDown}
        onMouseMove={handleChipsMouseMove}
        onMouseUp={handleChipsMouseUp}
        onMouseLeave={handleChipsMouseLeave}
        className={cn(
          "flex overflow-x-auto gap-2 scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 md:gap-3 select-none",
          "cursor-grab active:cursor-grabbing"
        )}
      >
        {FILTER_CHIPS.map((chip) => (
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
