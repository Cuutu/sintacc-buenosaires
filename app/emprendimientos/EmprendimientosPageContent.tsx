"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { VentureCard } from "@/components/ventures/VentureCard"
import { VENTURE_CATEGORIES } from "@/lib/venture-constants"
import { fetchApi } from "@/lib/fetchApi"
import type { IVenture } from "@/models/Venture"
import { ArrowLeft, ArrowDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type VentureItem = IVenture & { _id: string }

export default function EmprendimientosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")

  const [ventures, setVentures] = useState<VentureItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVentures = useCallback(async (category: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (category) params.set("category", category)
      const data = await fetchApi<{ ventures: VentureItem[] }>(
        `/api/ventures?${params}`
      )
      setVentures(data.ventures ?? [])
    } catch {
      setVentures([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVentures(categoryParam)
  }, [categoryParam, fetchVentures])

  const setCategory = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set("category", id)
    else params.delete("category")
    const q = params.toString()
    router.replace(q ? `/emprendimientos?${q}` : "/emprendimientos", { scroll: false })
  }

  const scrollToList = () => {
    document.getElementById("listado")?.scrollIntoView({ behavior: "smooth" })
  }

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

        <section className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden px-6 py-12 md:py-16 text-center mb-12">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
          <h1 className="relative text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            Descubrí emprendimientos sin gluten
          </h1>
          <p className="relative text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-8">
            Marcas, cocineros y proyectos aptos para celíacos recomendados por la comunidad.
            Encontrá productos caseros, viandas, panificados, tortas, premezclas y más.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 min-h-[48px]" onClick={scrollToList}>
              Ver emprendimientos
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-[48px] gap-2">
              <Link href="/sugerir-emprendimiento">
                <Plus className="h-4 w-4" />
                Sugerir emprendimiento
              </Link>
            </Button>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory mb-8">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium shrink-0 snap-center transition-colors",
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
                "px-4 py-2 rounded-full text-sm font-medium shrink-0 snap-center transition-colors",
                categoryParam === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-white/10"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <section id="listado" className="scroll-mt-24">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : ventures.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/[0.02]">
              <p className="text-muted-foreground mb-6">
                Todavía no hay emprendimientos en esta categoría. ¡Podés ser el primero en sugerir uno!
              </p>
              <Button asChild>
                <Link href="/sugerir-emprendimiento">Sugerir emprendimiento</Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ventures.map((v) => (
                <VentureCard key={v._id} venture={v} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
