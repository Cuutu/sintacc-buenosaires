"use client"

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
}

export function MapTopBar({
  filters,
  onFiltersChange,
  onSearchChange,
  onFiltersOpen,
  placeholder = "Buscar lugares...",
}: MapTopBarProps) {
  const toggleTag = (tagId: string) => {
    const tags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId]
    onFiltersChange({ ...filters, tags })
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-30 px-4 pt-3 pb-2 bg-black/40 backdrop-blur-md border-b border-white/10 md:top-6 md:left-6 md:right-auto md:max-w-md md:rounded-2xl md:border md:border-white/10 md:px-5 md:pt-5 md:pb-4 md:shadow-xl md:shadow-black/30 md:border-white/20">
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
      <div className="flex overflow-x-auto gap-2 scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 md:gap-3">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => toggleTag(chip.id)}
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
