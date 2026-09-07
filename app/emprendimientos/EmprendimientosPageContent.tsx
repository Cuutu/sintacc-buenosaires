"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { VentureCard, VentureCardSkeleton, type VentureCardData } from "@/components/ventures/VentureCard"
import { VentureFeaturedRail } from "@/components/ventures/VentureFeaturedRail"
import { VentureExploreSections } from "@/components/ventures/VentureExploreSections"
import { VenturesEmptyState } from "@/components/ventures/VenturesEmptyState"
import { VENTURE_CATEGORIES, getCategoryLabel, VENTURE_CATALOG_INTRO } from "@/lib/venture-constants"
import { isArgentinaVentureZone, VENTURE_AR_ZONE_LANDINGS } from "@/lib/venture-argentina"
import { matchesVentureSearch, resolveVentureCategoryFromQuery } from "@/lib/venture-search"
import { cn } from "@/lib/utils"

const HERO_CHIPS = [
  { key: "all", label: "Todas" },
  { key: "panificados", label: "Panificados", category: "panificados" },
  { key: "pasteleria", label: "Pastelería", category: "pasteleria" },
  { key: "viandas", label: "Viandas", category: "viandas" },
  { key: "congelados", label: "Congelados", category: "congelados" },
  { key: "premezclas", label: "Premezclas", category: "premezclas" },
  { key: "catering", label: "Catering", category: "catering" },
  { key: "delivery", label: "Delivery", modality: "delivery" },
  { key: "retiro", label: "Retiro", modality: "retiro" },
] as const

type Suggestion = {
  id: string
  label: string
  hint: string
  categoryId?: string
  href?: string
}

function buildListPath(params: URLSearchParams): string {
  const q = params.toString()
  return q ? `/emprendimientos?${q}` : "/emprendimientos"
}

export default function EmprendimientosPageContent({
  initialVentures,
}: {
  initialVentures: VentureCardData[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const modalityParam = searchParams.get("modality")
  const searchParam = searchParams.get("search") ?? ""

  const ventures = useMemo(
    () =>
      initialVentures.filter(
        (v) => isArgentinaVentureZone(v.zone) && v.safetyLevel !== "gf_options"
      ),
    [initialVentures]
  )
  const [searchInput, setSearchInput] = useState(searchParam)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const skipDebounceRef = useRef(false)

  useEffect(() => {
    setSearchInput(searchParam)
  }, [searchParam])

  const navigate = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    skipDebounceRef.current = true
    router.replace(buildListPath(params), { scroll: false })
  }

  const applyCategory = (categoryId: string) => {
    setSuggestOpen(false)
    navigate((params) => {
      params.delete("search")
      params.delete("modality")
      params.set("category", categoryId)
    })
  }

  useEffect(() => {
    const guessed = resolveVentureCategoryFromQuery(searchParam)
    if (guessed && !categoryParam && !modalityParam) {
      applyCategory(guessed)
    }
    // Hidrata links compartidos `?search=pan` una vez; no reaplicar en cada debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false
      return
    }
    const t = setTimeout(() => {
      const trimmed = searchInput.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (trimmed.length >= 2) params.set("search", trimmed)
      else params.delete("search")
      const next = buildListPath(params)
      const current = buildListPath(searchParams)
      if (next !== current) router.replace(next, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const setChip = (chip: (typeof HERO_CHIPS)[number]) => {
    setSuggestOpen(false)
    navigate((params) => {
      params.delete("search")
      params.delete("category")
      params.delete("modality")
      if ("category" in chip && chip.category) params.set("category", chip.category)
      if ("modality" in chip && chip.modality) params.set("modality", chip.modality)
    })
  }

  const submitSearch = () => {
    const trimmed = searchInput.trim()
    const guessed = resolveVentureCategoryFromQuery(trimmed)
    if (guessed) {
      applyCategory(guessed)
      return
    }
    navigate((params) => {
      if (trimmed.length >= 2) params.set("search", trimmed)
      else params.delete("search")
    })
    setSuggestOpen(false)
  }

  const displayedVentures = useMemo(() => {
    return ventures.filter((v) => {
      if (categoryParam && v.category !== categoryParam) return false
      if (modalityParam && !(v.modalities ?? []).some((m) => m === modalityParam)) return false
      return matchesVentureSearch(v, searchParam)
    })
  }, [ventures, categoryParam, modalityParam, searchParam])

  const categoryGuess = !categoryParam ? resolveVentureCategoryFromQuery(searchParam) : null
  const categoryFallback =
    displayedVentures.length === 0 && categoryGuess
      ? ventures.filter((v) => v.category === categoryGuess)
      : []
  const list = displayedVentures.length > 0 ? displayedVentures : categoryFallback
  const usedCategoryFallback = displayedVentures.length === 0 && categoryFallback.length > 0

  const suggestions = useMemo((): Suggestion[] => {
    const q = searchInput.trim().toLowerCase()
    if (q.length < 2) return []
    const cats: Suggestion[] = []
    const zones: Suggestion[] = []
    const brands: Suggestion[] = []

    for (const cat of VENTURE_CATEGORIES) {
      if (cats.length >= 3) break
      if (cat.label.toLowerCase().includes(q) || cat.id.includes(q)) {
        cats.push({
          id: `cat-${cat.id}`,
          label: cat.label,
          hint: "Categoría",
          categoryId: cat.id,
        })
      }
    }
    for (const zone of VENTURE_AR_ZONE_LANDINGS) {
      if (zones.length >= 2) break
      if (zone.label.toLowerCase().includes(q)) {
        zones.push({
          id: `zone-${zone.slug}`,
          label: zone.label,
          hint: "Zona",
          href: `/emprendimientos/${zone.slug}`,
        })
      }
    }
    for (const v of ventures) {
      if (brands.length >= 5) break
      if (v.name.toLowerCase().includes(q)) {
        brands.push({
          id: v._id,
          label: v.name,
          hint: v.zone,
          href: `/emprendimientos/${v.slug ?? v._id}`,
        })
      }
    }
    return [...cats, ...zones, ...brands].slice(0, 8)
  }, [searchInput, ventures])

  const showEmpty = list.length === 0
  const hasActiveSearch = searchParam.trim().length >= 2
  const hasFilter = Boolean(categoryParam || modalityParam || hasActiveSearch)
  const isSearchPending =
    searchInput.trim() !== searchParam.trim() && searchInput.trim().length >= 2
  const activeChip = HERO_CHIPS.find((c) => {
    if ("category" in c && c.category && c.category === categoryParam) return true
    if ("modality" in c && c.modality && c.modality === modalityParam) return true
    return false
  })

  const countLabel = showEmpty
    ? hasActiveSearch
      ? `0 resultados para “${searchParam}”`
      : categoryParam
        ? `0 resultados en ${getCategoryLabel(categoryParam)}`
        : "0 emprendimientos"
    : `${list.length} ${list.length === 1 ? "emprendimiento" : "emprendimientos"}`

  return (
    <div className="min-h-screen scroll-mt-[var(--desktop-nav-clearance)] bg-[#F3EEE4] pb-[calc(var(--bottom-nav-clearance)+1.5rem)] md:pb-16">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 md:px-8 md:pt-10">
        <header className="mb-10 max-w-2xl">
          <h1 className="font-display font-bold tracking-tight text-[#1F4D35]">
            <span className="block text-base font-medium tracking-[0.04em] text-[#5F6B63] md:text-lg">
              Descubrí
            </span>
            <span className="mt-1 block font-display text-[2.05rem] leading-[0.95] tracking-[-0.04em] text-[#C85A2E] md:text-[3.75rem]">
              emprendimientos
            </span>
            <span className="mt-1 block text-[1.65rem] leading-tight md:text-[2.25rem]">sin gluten</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5F6B63]">
            Pastelería, panificados, viandas, congelados y productos artesanales. {VENTURE_CATALOG_INTRO}
          </p>

          <div ref={boxRef} className="relative mt-6">
            <label htmlFor="venture-search" className="sr-only">
              Buscar emprendimientos
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5F6B63]" />
            <input
              id="venture-search"
              type="search"
              autoComplete="off"
              placeholder="Buscar viandas, panificados, pastelería o una ciudad"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setSuggestOpen(true)
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitSearch()
                }
              }}
              className="h-14 w-full rounded-2xl border border-[#E8E1D6] bg-white pl-12 pr-4 text-base text-[#1F4D35] outline-none ring-offset-2 placeholder:text-[#5F6B63]/70 focus:ring-2 focus:ring-[#1F4D35]/25"
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#E8E1D6] bg-white py-2 shadow-[0_16px_40px_-24px_rgba(31,77,53,0.45)]"
                role="listbox"
              >
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#F8F5EF]"
                      onClick={() => {
                        if (s.categoryId) {
                          applyCategory(s.categoryId)
                          return
                        }
                        setSuggestOpen(false)
                        if (s.href) router.push(s.href)
                      }}
                    >
                      <span className="text-base font-medium text-[#1F4D35]">{s.label}</span>
                      <span className="text-sm text-[#5F6B63]">{s.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-3 text-xs text-[#5F6B63] md:hidden">Deslizá para ver más categorías</p>
          <div className="relative mt-2 md:mt-4">
            <div
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pr-12 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pr-0"
              data-overflow-allowed="venture-chips"
            >
              {HERO_CHIPS.map((chip) => {
                const selected =
                  chip.key === "all" ? !categoryParam && !modalityParam : activeChip?.key === chip.key
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setChip(chip)}
                    className={cn(
                      "h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                      selected
                        ? "border-[#C85A2E] bg-[#C85A2E] text-[#F8F5EF]"
                        : "border-[#E8E1D6] bg-white text-[#1F4D35] hover:border-[#1F4D35]/30"
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#F3EEE4] md:hidden"
              aria-hidden
            />
          </div>
        </header>

        {!hasFilter && <VentureFeaturedRail ventures={ventures} />}

        <section
          id="listado"
          aria-labelledby="catalog-heading"
          className="mb-14 scroll-mt-[calc(var(--desktop-nav-clearance)+0.75rem)]"
        >
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="catalog-heading" className="text-lg font-semibold text-[#1F4D35]">
              {hasFilter ? "Resultados" : "Todos los emprendimientos"}
            </h2>
            <p className="text-sm font-medium text-[#5F6B63]" aria-live="polite">
              {isSearchPending ? "Buscando…" : countLabel}
            </p>
          </div>

          {usedCategoryFallback && categoryGuess ? (
            <p className="mb-4 rounded-xl border border-[#E8E1D6] bg-white px-4 py-3 text-sm text-[#5F6B63]">
              No hay coincidencias de texto para “{searchParam}”. Mostramos la categoría{" "}
              <strong className="text-[#1F4D35]">{getCategoryLabel(categoryGuess)}</strong>.
            </p>
          ) : null}

          {isSearchPending ? (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
              aria-busy="true"
              aria-label="Cargando emprendimientos"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <VentureCardSkeleton key={i} />
              ))}
            </div>
          ) : showEmpty ? (
            <VenturesEmptyState search={hasActiveSearch ? searchParam : undefined} categoryId={categoryParam} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {list.map((v) => (
                <VentureCard key={v._id} venture={v} />
              ))}
            </div>
          )}
        </section>

        <VentureExploreSections />
      </div>
    </div>
  )
}
