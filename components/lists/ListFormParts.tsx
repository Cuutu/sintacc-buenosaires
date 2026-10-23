"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Globe, Link2, Lock, Search } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { fetchApi } from "@/lib/fetchApi"
import { LIST_SHARE_HINTS, LIST_SHARE_LABELS, type ListShareState } from "@/lib/lists/share-state"
import { cn } from "@/lib/utils"

/** Lugar como lo usan los modales (favorito, de la lista o del buscador). */
export type PlaceLite = {
  _id: string
  name: string
  neighborhood?: string
  photos?: string[]
  type?: string
  slug?: string
}

/** Textos de ejemplo argentinos (revisión 23/10). */
export const LIST_NAME_PLACEHOLDER = "Ej: Salidas sin TACC en Palermo"
export const LIST_DESTINATION_PLACEHOLDER = "Ej: Bariloche, Río Negro"

/**
 * Clases de los modales de listas. En el celular: acciones fijas abajo, campos con
 * letra de 16 px (con 14 el iPhone hace zoom) y filas de 44 px.
 */
export const listModalUi = {
  content: "flex max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
  header: "px-5 pb-3 pt-5 pr-14 text-left",
  body: "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5",
  footer:
    "sticky bottom-0 flex flex-row gap-2 border-t border-[#E6DFD2] bg-background px-5 pb-[max(0.75rem,var(--safe-area-bottom,0px))] pt-3 sm:justify-end sm:space-x-0 [&>*]:flex-1 sm:[&>*]:flex-none",
  field: "mt-1.5 text-base",
  label: "text-sm font-bold text-[#2D4A34]",
} as const

/**
 * Al abrir, el foco va al modal y no al primer campo: en el celular Radix enfocaba y
 * seleccionaba "Nombre", y se abría el teclado tapando medio modal.
 */
export function focusDialogContent(event: Event) {
  event.preventDefault()
  const el = event.currentTarget
  if (el instanceof HTMLElement) el.focus({ preventScroll: true })
}

const SHARE_OPTIONS: { state: ListShareState; icon: typeof Globe }[] = [
  { state: "public", icon: Globe },
  { state: "link", icon: Link2 },
  { state: "private", icon: Lock },
]

/** Visibilidad: Pública / Con enlace / Privada. La misma en Crear y en Gestionar. */
export function ListVisibilityField({
  value,
  onChange,
}: {
  value: ListShareState
  onChange: (value: ListShareState) => void
}) {
  return (
    <fieldset>
      <legend className={listModalUi.label}>Visibilidad</legend>
      <div className="mt-1.5 grid gap-2" role="radiogroup" aria-label="Visibilidad">
        {SHARE_OPTIONS.map(({ state, icon: Icon }) => {
          const selected = value === state
          return (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(state)}
              className={cn(
                "flex min-h-[44px] items-start gap-3 rounded-[14px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/30",
                selected ? "border-[#1F4D35] bg-[#E3EEE5]" : "border-[#E6DFD2] bg-white hover:border-[#1F4D35]/30"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1F4D35]" aria-hidden />
              <span>
                <span className="block text-base font-bold text-[#2D4A34]">{LIST_SHARE_LABELS[state]}</span>
                <span className="block text-sm text-[#5E6A60]">{LIST_SHARE_HINTS[state]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Busca lugares publicados por nombre o barrio (desde 2 letras, con 300 ms de espera). */
export function usePlaceSearch(open: boolean) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<PlaceLite[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) {
      setSearch("")
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await fetchApi<{ places: PlaceLite[] }>(`/api/places?search=${encodeURIComponent(q)}&limit=8`)
        if (!alive) return
        setResults((data.places ?? []).map((p) => ({ ...p, _id: String(p._id) })))
      } catch {
        if (alive) setResults([])
      } finally {
        if (alive) setSearching(false)
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [search, open])

  const clear = () => {
    setSearch("")
    setResults([])
  }

  return { search, setSearch, results, searching, clear }
}

/** Buscador "Buscar lugares para agregar", el mismo en los dos modales. */
export function PlaceSearchBox({
  search,
  onSearch,
  results,
  searching,
  selectedIds,
  onPick,
}: {
  search: string
  onSearch: (value: string) => void
  results: PlaceLite[]
  searching: boolean
  selectedIds: string[]
  onPick: (place: PlaceLite) => void
}) {
  const resultsRef = useRef<HTMLUListElement>(null)
  // Los resultados aparecen abajo del campo, a veces detrás de los botones fijos: se acercan solos.
  useEffect(() => {
    if (results.length > 0) resultsRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" })
  }, [results])

  return (
    <div>
      <label htmlFor="list-place-search" className={listModalUi.label}>
        Buscar lugares para agregar
      </label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6A60]" aria-hidden />
        <input
          id="list-place-search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Nombre o barrio"
          autoComplete="off"
          className="flex h-12 w-full rounded-lg border border-olive/20 bg-cream pl-9 pr-4 text-base text-olive placeholder:text-muted-foreground focus-visible:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30"
        />
      </div>
      {searching ? <p className="mt-1.5 text-sm text-[#5E6A60]">Buscando...</p> : null}
      {results.length > 0 ? (
        <ul ref={resultsRef} className="mt-1.5 max-h-48 scroll-mb-3 overflow-y-auto rounded-[14px] border border-[#E6DFD2] bg-white p-1">
          {results.map((place) => {
            const already = selectedIds.includes(place._id)
            return (
              <li key={place._id}>
                <button
                  type="button"
                  onClick={() => onPick(place)}
                  disabled={already}
                  className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-base hover:bg-[#F7F3EB] disabled:opacity-60"
                >
                  <span className="truncate font-bold text-[#2D4A34]">{place.name}</span>
                  <span className="shrink-0 text-sm text-[#5E6A60]">{already ? "Ya está" : place.neighborhood}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/** Fila de un lugar con casilla (44 px), orden y nota si está elegido. */
export function ListPlaceRow({
  place,
  selected,
  orderIdx,
  total,
  note,
  onToggle,
  onMove,
  onNote,
}: {
  place: PlaceLite
  selected: boolean
  orderIdx: number
  total: number
  note: string
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  onNote: (value: string) => void
}) {
  return (
    <div className={cn("rounded-[12px] px-2", selected ? "bg-[#F7F3EB]" : "hover:bg-[#F7F3EB]/60")}>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-5 w-5 shrink-0 rounded accent-[#1F4D35]"
        />
        <span className="min-w-0 flex-1 truncate text-base text-[#2D4A34]">{place.name}</span>
        {place.neighborhood ? (
          <span className="max-w-[40%] shrink-0 truncate text-sm text-[#5E6A60]">{place.neighborhood}</span>
        ) : null}
      </label>
      {selected ? (
        <div className="space-y-2 pb-2 pl-8">
          <div className="flex items-center gap-1">
            <span className="text-sm text-[#5E6A60]">#{orderIdx + 1}</span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[#2D4A34] hover:bg-white disabled:opacity-40"
              onClick={() => onMove(-1)}
              disabled={orderIdx <= 0}
              aria-label={`Subir ${place.name}`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[#2D4A34] hover:bg-white disabled:opacity-40"
              onClick={() => onMove(1)}
              disabled={orderIdx >= total - 1}
              aria-label={`Bajar ${place.name}`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Nota (opcional)"
            maxLength={500}
            rows={2}
            className="text-base"
          />
        </div>
      ) : null}
    </div>
  )
}

/** Sube o baja un id en el orden. */
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] {
  const idx = ids.indexOf(id)
  const nextIdx = idx + dir
  if (idx < 0 || nextIdx < 0 || nextIdx >= ids.length) return ids
  const copy = [...ids]
  ;[copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]]
  return copy
}

/**
 * Orden de las filas: primero los lugares elegidos (los de la lista, en su orden), después
 * los favoritos y al final los que se sumaron con el buscador.
 */
export function orderPlaceRows(
  orderedIds: string[],
  pool: Map<string, PlaceLite>,
  others: PlaceLite[]
): PlaceLite[] {
  const seen = new Set<string>()
  const rows: PlaceLite[] = []
  for (const id of orderedIds) {
    const place = pool.get(id)
    if (place && !seen.has(id)) {
      seen.add(id)
      rows.push(place)
    }
  }
  for (const place of others) {
    if (!seen.has(place._id)) {
      seen.add(place._id)
      rows.push(place)
    }
  }
  return rows
}
