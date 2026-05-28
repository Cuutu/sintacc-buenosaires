"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VentureCard } from "@/components/ventures/VentureCard"
import { VenturesExplainer } from "@/components/ventures/VenturesExplainer"
import { VenturesEmptyState } from "@/components/ventures/VenturesEmptyState"
import { VENTURE_CATEGORIES } from "@/lib/venture-constants"
import { getCategoryLandingPath } from "@/lib/venture-seo"
import { matchesVentureSearch } from "@/lib/venture-search"
import { fetchApi } from "@/lib/fetchApi"
import type { IVenture } from "@/models/Venture"
import { ArrowLeft, ArrowDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type VentureItem = IVenture & { _id: string }

export default function EmprendimientosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const searchParam = searchParams.get("search") ?? ""

  const [ventures, setVentures] = useState<VentureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParam)

  const fetchVentures = useCallback(
    async (category: string | null, search: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: "50" })
        if (category) params.set("category", category)
        if (search.trim().length >= 2) params.set("search", search.trim())
        const data = await fetchApi<{ ventures: VentureItem[] }>(
          `/api/ventures?${params}`
        )
        setVentures(data.ventures ?? [])
      } catch {
        setVentures([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchVentures(categoryParam, searchParam)
  }, [categoryParam, searchParam, fetchVentures])

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
      if (next !== currentPath) {
        router.replace(next, { scroll: false })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput, router, searchParams])

  const setCategory = (id: string | null) => {
    if (id) {
      router.push(getCategoryLandingPath(id))
      return
    }
    router.replace("/emprendimientos", { scroll: false })
  }

  const scrollToExplore = () => {
    document.getElementById("explorar")?.scrollIntoView({ behavior: "smooth" })
  }

  const displayedVentures = ventures.filter((v) =>
    matchesVentureSearch(v, searchParam)
  )

  const showEmpty = !loading && displayedVentures.length === 0
  const hasActiveSearch = searchParam.trim().length >= 2

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* 1. Hero */}
        <section className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden px-6 py-12 md:py-16 text-center mb-12 md:mb-14">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
          <h1 className="relative text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            Descubrí emprendimientos sin gluten
          </h1>
          <p className="relative text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-8">
            Marcas, cocineros y proyectos que venden productos aptos para celíacos: viandas,
            pastelería, panificados, congelados, premezclas y más.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 min-h-[48px] shadow-lg shadow-primary/20" onClick={scrollToExplore}>
              Explorar emprendimientos
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-[48px]">
              <Link href="/sugerir-emprendimiento">Sugerir uno</Link>
            </Button>
          </div>
        </section>

        {/* 2. Explicativa */}
        <VenturesExplainer />

        {/* 3–5. Buscador, filtros, listado */}
        <section id="explorar" className="scroll-mt-24">
          <div className="mb-6">
            <label htmlFor="venture-search" className="sr-only">
              Buscar emprendimientos
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="venture-search"
                type="search"
                placeholder="Buscar tortas, viandas, panificados, CABA..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-11 h-12 bg-card/50 border-border/50 focus:border-primary/50 rounded-xl"
              />
            </div>
          </div>

          {/* Filtros: wrap desktop, scroll mobile */}
          <div
            className={cn(
              "flex gap-2 mb-8",
              "max-md:overflow-x-auto max-md:flex-nowrap max-md:pb-2 max-md:-mx-4 max-md:px-4 max-md:scrollbar-hide max-md:snap-x",
              "md:flex-wrap"
            )}
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                "max-md:shrink-0 max-md:snap-center",
                !categoryParam
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-white/10"
              )}
            >
              Todos
            </button>
            {VENTURE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  "max-md:shrink-0 max-md:snap-center",
                  categoryParam === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border border-white/10"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div id="listado">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-80 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : showEmpty ? (
              <>
                {hasActiveSearch && (
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    No encontramos resultados para &ldquo;{searchParam}&rdquo;
                    {categoryParam ? " en esta categoría" : ""}.
                  </p>
                )}
                <VenturesEmptyState hasCategoryFilter={!!categoryParam} />
              </>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedVentures.map((v) => (
                  <VentureCard key={v._id} venture={v} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
