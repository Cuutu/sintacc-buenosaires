"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { VentureCard } from "@/components/ventures/VentureCard"
import { VentureFeaturedRail } from "@/components/ventures/VentureFeaturedRail"
import { VentureExploreSections } from "@/components/ventures/VentureExploreSections"
import { VenturesEmptyState } from "@/components/ventures/VenturesEmptyState"
import { VENTURE_CATEGORIES } from "@/lib/venture-constants"
import { VENTURE_ZONE_LANDINGS } from "@/lib/venture-seo"
import { matchesVentureSearch } from "@/lib/venture-search"
import { fetchApi } from "@/lib/fetchApi"
import type { IVenture } from "@/models/Venture"
import { cn } from "@/lib/utils"

type VentureItem = IVenture & { _id: string }

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
  href?: string
}

export default function EmprendimientosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const modalityParam = searchParams.get("modality")
  const searchParam = searchParams.get("search") ?? ""

  const [ventures, setVentures] = useState<VentureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParam)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const fetchVentures = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApi<{ ventures: VentureItem[] }>("/api/ventures?limit=80")
      setVentures(data.ventures ?? [])
    } catch {
      setVentures([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVentures()
  }, [fetchVentures])

  useEffect(() => {
    setSearchInput(searchParam)
  }, [searchParam])

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (trimmed.length >= 2) params.set("search", trimmed)
      else params.delete("search")
      const q = params.toString()
      const next = q ? `/emprendimientos?${q}` : "/emprendimientos"
      const current = searchParams.toString()
      const currentPath = current ? `/emprendimientos?${current}` : "/emprendimientos"
      if (next !== currentPath) router.replace(next, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput, router, searchParams])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    const q = params.toString()
    router.replace(q ? `/emprendimientos?${q}` : "/emprendimientos", { scroll: false })
  }

  const setChip = (chip: (typeof HERO_CHIPS)[number]) => {
    replaceParams((params) => {
      params.delete("category")
      params.delete("modality")
      if ("category" in chip && chip.category) params.set("category", chip.category)
      if ("modality" in chip && chip.modality) params.set("modality", chip.modality)
    })
  }

  const displayedVentures = ventures.filter((v) => {
    if (categoryParam && v.category !== categoryParam) return false
    if (modalityParam && !(v.modalities ?? []).some((m) => m === modalityParam)) return false
    return matchesVentureSearch(v, searchParam)
  })

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
          href: `/emprendimientos?category=${cat.id}`,
        })
      }
    }
    for (const zone of VENTURE_ZONE_LANDINGS) {
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

  const showEmpty = !loading && displayedVentures.length === 0
  const hasActiveSearch = searchParam.trim().length >= 2
  const hasFilter = Boolean(categoryParam || modalityParam || hasActiveSearch)
  const activeChip = HERO_CHIPS.find((c) => {
    if ("category" in c && c.category && c.category === categoryParam) return true
    if ("modality" in c && c.modality && c.modality === modalityParam) return true
    return false
  })

  return (
    <div className="min-h-screen bg-[#F3EEE4]">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 md:px-8 md:pt-10">
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
            Pastelería, panificados, viandas, congelados y productos artesanales recomendados por la
            comunidad.
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

          <div
            className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
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
        </header>

        {!hasFilter && <VentureFeaturedRail ventures={ventures} />}

        <section id="listado" aria-labelledby="catalog-heading" className="mb-14">
          <h2 id="catalog-heading" className="mb-5 text-lg font-semibold text-[#1F4D35]">
            {hasFilter ? "Resultados" : "Todos los emprendimientos"}
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-[24px] border border-[#E8E1D6] bg-[#E8E1D6]/50"
                />
              ))}
            </div>
          ) : showEmpty ? (
            <>
              {hasActiveSearch && (
                <p className="mb-6 text-center text-base text-[#5F6B63]">
                  No encontramos resultados para &ldquo;{searchParam}&rdquo;.
                </p>
              )}
              <VenturesEmptyState hasCategoryFilter={!!categoryParam} />
            </>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {displayedVentures.map((v) => (
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
