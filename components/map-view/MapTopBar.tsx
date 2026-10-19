"use client"

import * as React from "react"
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { openCeliBot, preloadCeliBot } from "@/lib/celibot-open"
import { safetyModeFromTags, withSafetyMode, type SafetyMode } from "@/lib/safety-mode"
import { cn } from "@/lib/utils"
import { TYPES } from "@/lib/constants"
import { CountUp } from "./CountUp"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"
import type { PlaceSortOption } from "./place-sort"

const TAG_CHIPS = [
  { id: "cocina_separada", label: "Cocina separada" },
  { id: "certificado_sin_tacc", label: "Insumos certificados" },
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

export type SortOption = PlaceSortOption

interface MapTopBarProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  onSearchChange: (search: string) => void
  onFiltersOpen?: () => void
  placeholder?: string
  sort?: SortOption
  onSortChange?: (sort: SortOption) => void
  variant?: "overlay" | "sidebar"
  compact?: boolean
  /** Contador visible en sidebar (ej. "208 lugares en esta zona") */
  resultCountLabel?: string
  resultCount?: number
  onClearFilters?: () => void
  hasActiveFilters?: boolean
  activeQuery?: string
  onClearQuery?: () => void
  hasRatings?: boolean
  locationCta?: string | null
  onRequestLocation?: () => void
  locationMessage?: string | null
}

const TAG_CHIP_IDS = new Set<string>(TAG_CHIPS.map((chip) => chip.id))

const SAFETY_OPTIONS = [
  { mode: "todos" as const, label: "Todos", short: "Todos", dot: null, activeDot: null },
  { mode: "cien" as const, label: "100% sin TACC", short: "100%", dot: "bg-[#1F4D35]", activeDot: "bg-[#F7F3EB]" },
  { mode: "opc" as const, label: "Con opciones", short: "Opciones", dot: "bg-[#C85A2E]", activeDot: "bg-[#C85A2E]" },
]

/** Filtro activo en escritorio: se ve sin abrir el panel y se saca con la cruz. */
function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-9 items-center gap-0.5 rounded-full bg-[#2D4A34]/[0.08] pl-3 pr-1 text-[13px] font-bold text-[#2D4A34]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#2D4A34]/70 hover:bg-[#2D4A34]/10 hover:text-[#2D4A34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  )
}

function PanelChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-bold transition-[color,background-color,border-color,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-[80ms] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "border-[#2D4A34] bg-[#2D4A34] text-[#F7F3EB]"
          : "border-[#E6DFD2] bg-white text-[#2D4A34] hover:border-[#2D4A34]/30 hover:bg-[#FBF8F1]"
      )}
    >
      {label}
    </button>
  )
}

/** Lo que se escribe se manda al mapa recién cuando se deja de tipear un momento. */
const SEARCH_INPUT_DEBOUNCE_MS = 250

/**
 * El texto del buscador vive acá: tipear ya no re-renderiza la página del mapa en cada
 * tecla (lista, pins y filtros), solo este input. Borrar se manda enseguida, y un
 * cambio que viene de afuera (la "x" del chip, la URL) se refleja en el input.
 */
function useSearchDraft(value: string, onChange: (next: string) => void) {
  const [draft, setDraft] = React.useState(value)
  const lastSentRef = React.useRef(value)
  const timerRef = React.useRef<number | undefined>(undefined)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  React.useEffect(() => {
    if (value === lastSentRef.current) return
    lastSentRef.current = value
    window.clearTimeout(timerRef.current)
    setDraft(value)
  }, [value])

  React.useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const update = React.useCallback((next: string) => {
    setDraft(next)
    window.clearTimeout(timerRef.current)
    const send = () => {
      lastSentRef.current = next
      onChangeRef.current(next)
    }
    if (next.trim() === "") send()
    else timerRef.current = window.setTimeout(send, SEARCH_INPUT_DEBOUNCE_MS)
  }, [])

  return [draft, update] as const
}

export function MapTopBar({
  filters,
  onFiltersChange,
  onSearchChange,
  onFiltersOpen,
  placeholder = "Buscar lugar o zona...",
  sort = "recommended",
  onSortChange,
  variant = "overlay",
  compact = false,
  resultCountLabel,
  resultCount,
  onClearFilters,
  hasActiveFilters = false,
  activeQuery,
  onClearQuery,
  hasRatings = false,
  locationCta,
  onRequestLocation,
  locationMessage,
}: MapTopBarProps) {
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const moreRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)
  const didDragRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const isSidebar = variant === "sidebar"
  const reduceMotion = usePrefersReducedMotion()
  const [searchDraft, setSearchDraft] = useSearchDraft(filters.search, onSearchChange)
  const queryLabel = activeQuery?.trim() ?? ""

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

  // Mismo filtro de seguridad que el selector mobile (tags excluyentes): así el modo
  // "Sólo 100% sin TACC" se ve y se cambia igual en escritorio.
  const safetyMode = safetyModeFromTags(filters.tags)

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
      <div className="shrink-0 space-y-3 border-b border-olive/10 px-4 pb-3 pt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder={placeholder}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Buscar lugar o zona"
            className="h-11 rounded-2xl border-olive/10 bg-olive/5 pl-10 text-sm text-olive placeholder:text-muted-foreground focus-visible:ring-primary/60"
          />
        </div>

        {queryLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border border-[#1F4D35]/15 bg-[#1F4D35]/8 py-1 pl-3 pr-1 text-[12px] font-semibold text-[#1F4D35]",
              !reduceMotion && "map-query-chip"
            )}>
              {queryLabel}
              {onClearQuery && (
                <button
                  type="button"
                  onClick={onClearQuery}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#1F4D35]/70 hover:bg-[#1F4D35]/10 hover:text-[#1F4D35]"
                  aria-label={`Quitar búsqueda ${queryLabel}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
        ) : null}

        {/* Mismo selector que en mobile: excluyente, y el punto de color hace de leyenda. */}
        <div
          role="radiogroup"
          aria-label="Qué lugares mostrar"
          className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-0.5 rounded-full bg-[#1F4D35]/[0.06] p-1"
        >
          {SAFETY_OPTIONS.map((opt) => {
            const active = safetyMode === opt.mode
            return (
              <button
                key={opt.mode}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={opt.label}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    safetyLevel: undefined,
                    tags: withSafetyMode(filters.tags, opt.mode),
                  })
                }
                className={cn(
                  "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold tracking-[0.005em] transition-[color,background-color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-[80ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:active:scale-100",
                  active
                    ? "bg-[#2D4A34] text-[#F7F3EB] shadow-[0_4px_12px_-6px_rgba(31,42,34,0.55)]"
                    : "text-[#1F4D35]/80 hover:text-[#1F4D35]"
                )}
              >
                {opt.dot ? (
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full ring-2",
                      active ? opt.activeDot : opt.dot,
                      active ? "ring-[#F7F3EB]/40" : "ring-white"
                    )}
                  />
                ) : null}
                <span className="truncate">{opt.label}</span>
              </button>
            )
          })}
        </div>

        <div ref={moreRef} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="mapa-more-filters"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold text-[#2D4A34] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                moreOpen
                  ? "border-[#2D4A34]/40 bg-[#2D4A34]/[0.06]"
                  : "border-[#2D4A34]/15 bg-white hover:border-[#2D4A34]/30"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {moreActiveCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2D4A34] px-1.5 text-[11px] font-black text-[#F7F3EB]">
                  {moreActiveCount}
                </span>
              )}
            </button>

            {/* Filtros activos a la vista, cada uno se saca con su cruz. */}
            {filters.type ? (
              <ActiveFilterChip
                label={TYPE_LABELS[filters.type] ?? "Tipo"}
                onRemove={() => onFiltersChange({ ...filters, type: undefined })}
              />
            ) : null}
            {TAG_CHIPS.filter((chip) => filters.tags.includes(chip.id)).map((chip) => (
              <ActiveFilterChip key={chip.id} label={chip.label} onRemove={() => toggleTag(chip.id)} />
            ))}
          </div>

          {/* Inline panel: evita corte por overflow del aside */}
          {moreOpen && (
            <div
              id="mapa-more-filters"
              role="region"
              aria-label="Filtros"
              className="max-h-[min(55vh,380px)] overflow-y-auto rounded-[20px] border border-[#E6DFD2] bg-white p-4 shadow-[0_14px_30px_-20px_rgba(31,42,34,0.35)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold text-[#2D4A34]">Tipo de lugar</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#2D4A34]/60 hover:bg-[#2D4A34]/[0.06] hover:text-[#2D4A34]"
                  aria-label="Cerrar filtros"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TYPES.map((type) => (
                  <PanelChip
                    key={type.value}
                    label={TYPE_LABELS[type.value] ?? type.label}
                    active={filters.type === type.value}
                    onClick={() => toggleType(type.value)}
                  />
                ))}
              </div>

              <p className="mt-4 text-[13px] font-extrabold text-[#2D4A34]">Características</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TAG_CHIPS.map((chip) => (
                  <PanelChip
                    key={chip.id}
                    label={chip.label}
                    active={filters.tags.includes(chip.id)}
                    onClick={() => toggleTag(chip.id)}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#2D4A34]/[0.08] pt-3">
                {moreActiveCount > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        type: undefined,
                        tags: filters.tags.filter((tag) => !TAG_CHIP_IDS.has(tag)),
                      })
                    }
                    className="h-9 rounded-full px-3 text-[13px] font-bold text-[#5E6A60] hover:text-[#2D4A34]"
                  >
                    Borrar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="h-9 rounded-full bg-[#2D4A34] px-4 text-[13px] font-extrabold text-[#F7F3EB] hover:bg-[#24402D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40 focus-visible:ring-offset-2"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>

        {(resultCountLabel || onSortChange || hasActiveFilters) && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {typeof resultCount === "number" ? (
                  <>
                    <CountUp value={resultCount} reduceMotion={reduceMotion} />
                    {queryLabel
                      ? ` en ${queryLabel}`
                      : ` lugar${resultCount !== 1 ? "es" : ""} en esta zona`}
                  </>
                ) : (
                  resultCountLabel
                )}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {hasActiveFilters && onClearFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-xs font-medium text-muted-foreground transition hover:text-olive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Limpiar filtros
                  </button>
                )}
                {onSortChange && (
                  <label className="relative inline-flex items-center">
                    <span className="sr-only">Ordenar resultados</span>
                    <select
                      value={sort}
                      name="map-place-sort"
                      onChange={(e) => onSortChange(e.target.value as SortOption)}
                      className="h-9 appearance-none rounded-full border border-olive/15 bg-olive/5 py-1.5 pl-3 pr-8 text-xs font-semibold text-olive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <option value="nearest">Más cercanos</option>
                      <option value="recommended">Recomendados</option>
                      {hasRatings ? <option value="rating">Mejor valorados</option> : null}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </label>
                )}
              </div>
            </div>
            {locationCta && onRequestLocation ? (
              <button
                type="button"
                onClick={onRequestLocation}
                className="text-left text-xs font-semibold text-[#B84420] hover:underline"
              >
                {locationCta}
              </button>
            ) : null}
            {locationMessage ? (
              <p className="text-xs text-muted-foreground">{locationMessage}</p>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // Mobile overlay: selector único de seguridad (Todos / 100% / Con opciones).
  // Mismo filtro por tags que antes, pero excluyente: elegir uno saca el otro.
  // El punto de color de cada opción reemplaza a la leyenda fija.
  const setSafetyMode = (mode: SafetyMode) => {
    if (didDragRef.current) return
    onFiltersChange({ ...filters, tags: withSafetyMode(filters.tags, mode) })
  }

  return (
    <div
      data-map-topbar
      className={cn(
      "map-chrome fixed left-2 right-2 top-[calc(var(--safe-area-top)+var(--mobile-header-gap))] z-30 mx-auto max-w-[440px] min-w-0 rounded-[2rem] px-3 sm:left-3 sm:right-3 sm:px-3.5 md:left-6 md:right-auto md:top-6 md:max-w-md",
      compact ? "py-2" : "py-2.5"
    )}>
      <div className="mb-2 flex min-w-0 items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 stroke-[1.85] text-[#1F4D35]/45 max-[359px]:left-2.5 sm:left-3.5" aria-hidden />
          <input
            placeholder={placeholder}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Buscar lugar o zona"
            className="flex h-11 min-h-[44px] w-full min-w-0 rounded-full bg-transparent pl-10 pr-2 text-base max-[359px]:pl-9 max-[359px]:pr-1 outline-none transition placeholder:text-[#5F6B63]/70 focus-visible:ring-0 sm:pl-11"
            style={{
              color: "#2D4A34",
              WebkitTextFillColor: "#2D4A34",
              caretColor: "#D4633A",
            }}
          />
        </div>
        {onFiltersOpen && (
          <button
            type="button"
            onClick={onFiltersOpen}
            aria-label="Más filtros"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1F4D35]/70 transition hover:bg-[#1F4D35]/[0.06] hover:text-[#1F4D35]"
          >
            <SlidersHorizontal className="h-4 w-4 stroke-[1.85]" />
          </button>
        )}
        {/* CeliBot vive acá en el mapa mobile (ya no flota sobre la hoja de lugares). */}
        <button
          type="button"
          onClick={() => openCeliBot()}
          onPointerEnter={preloadCeliBot}
          onPointerDown={preloadCeliBot}
          onFocus={preloadCeliBot}
          aria-label="Preguntale a CeliBot"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_-3px_rgba(31,42,34,0.35)] max-[359px]:h-9 max-[359px]:w-9 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          data-testid="map-celibot-entry"
        >
          <Image src="/brand/celibot-192.webp" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-full object-contain max-[359px]:h-[30px] max-[359px]:w-[30px]" />
        </button>
      </div>

      {queryLabel ? (
        <div className="mb-2 flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border border-[#1F4D35]/12 bg-[#1F4D35]/8 py-0.5 pl-2.5 pr-0.5 text-[12px] font-semibold text-[#1F4D35]",
            !reduceMotion && "map-query-chip"
          )}>
            {queryLabel}
            {onClearQuery && (
              <button
                type="button"
                onClick={onClearQuery}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#1F4D35]/70"
                aria-label={`Quitar búsqueda ${queryLabel}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </div>
      ) : null}

      <div
        ref={chipsRef}
        role="radiogroup"
        aria-label="Qué lugares mostrar"
        onMouseDown={handleChipsMouseDown}
        onMouseMove={handleChipsMouseMove}
        onMouseUp={handleChipsMouseUp}
        onMouseLeave={handleChipsMouseUp}
        className="scrollbar-hide -mx-0.5 grid max-w-full min-w-0 select-none grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-0.5 overflow-x-auto rounded-full bg-[#1F4D35]/[0.06] p-1"
        data-overflow-allowed="map-chips"
      >
        {SAFETY_OPTIONS.map((opt) => {
          const active = safetyMode === opt.mode
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.label}
              onClick={() => setSafetyMode(opt.mode)}
              className={cn(
                "inline-flex min-h-[40px] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-bold tracking-[0.005em] transition-[color,background-color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-[80ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:active:scale-100",
                active
                  ? "bg-[#2D4A34] text-[#F7F3EB] shadow-[0_4px_12px_-6px_rgba(31,42,34,0.55)]"
                  : "text-[#1F4D35]/80 hover:text-[#1F4D35]"
              )}
            >
              {opt.dot ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full ring-2",
                    active ? opt.activeDot : opt.dot,
                    active ? "ring-[#F7F3EB]/40" : "ring-white"
                  )}
                />
              ) : null}
              {/* En pantallas angostas (<380px) el texto completo no entra: versión corta. */}
              <span className="truncate max-[379px]:hidden">{opt.label}</span>
              <span className="truncate min-[380px]:hidden">{opt.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
