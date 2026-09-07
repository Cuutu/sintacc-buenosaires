import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChefHat, Cake, Wheat, ArrowRight } from "lucide-react"
import { VENTURE_CATEGORIES, getCategoryLabel, type VentureCategoryId } from "@/lib/venture-constants"

const SUGGEST_CARDS: {
  icon: typeof ChefHat
  title: string
  text: string
  cta: string
  category: VentureCategoryId
}[] = [
  {
    icon: ChefHat,
    title: "Viandas sin gluten",
    text: "Comidas listas para facultad, trabajo o freezer.",
    cta: "Sugerir viandas",
    category: "viandas",
  },
  {
    icon: Cake,
    title: "Tortas y pastelería",
    text: "Cumpleaños, eventos y antojos sin TACC.",
    cta: "Sugerir pastelería",
    category: "pasteleria",
  },
  {
    icon: Wheat,
    title: "Panificados",
    text: "Panes, medialunas, budines y productos de todos los días.",
    cta: "Sugerir panificados",
    category: "panificados",
  },
]

const QUICK_CHIPS = VENTURE_CATEGORIES.slice(0, 5)

type VenturesEmptyStateProps = {
  search?: string
  categoryId?: string | null
  onClearHref?: string
}

export function VenturesEmptyState({
  search,
  categoryId,
  onClearHref = "/emprendimientos",
}: VenturesEmptyStateProps) {
  const categoryLabel = categoryId ? getCategoryLabel(categoryId) : null
  const heading = search
    ? `0 resultados para “${search}”`
    : categoryLabel
      ? `Todavía no hay emprendimientos en ${categoryLabel}`
      : "Todavía no hay emprendimientos publicados"

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-[#E8E1D6] bg-[#FDFBF7] px-6 py-12 text-center md:px-10 md:py-16">
        <h3 className="mb-3 text-lg font-bold text-[#1F4D35] md:text-xl">{heading}</h3>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#5F6B63]">
          Probá otra categoría o limpiá los filtros. Si conocés un emprendimiento, podés sugerirlo.
        </p>
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {QUICK_CHIPS.map((chip) => (
            <Link
              key={chip.id}
              href={`/emprendimientos?category=${chip.id}`}
              className="inline-flex h-11 items-center rounded-full border border-[#E8E1D6] bg-white px-4 text-sm font-semibold text-[#1F4D35] hover:border-[#1F4D35]/30"
            >
              {chip.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" className="min-h-[48px]">
            <Link href={onClearHref}>Limpiar filtros</Link>
          </Button>
          <Button asChild size="lg" className="min-h-[48px] gap-2 shadow-lg shadow-primary/20">
            <Link href="/sugerir-emprendimiento">
              Publicar emprendimiento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground/70">
          Las sugerencias se revisan antes de publicarse.
        </p>
      </div>

      <div>
        <h4 className="mb-5 text-center text-sm font-semibold text-muted-foreground">
          También podés sugerir por categoría
        </h4>
        <div className="grid gap-4 sm:grid-cols-3">
          {SUGGEST_CARDS.map((card) => (
            <div
              key={card.category}
              className="flex flex-col rounded-xl border border-olive/10 bg-olive/5 p-5 transition-all hover:border-primary/25 hover:bg-primary/5"
            >
              <card.icon className="mb-3 h-7 w-7 text-primary" aria-hidden />
              <h5 className="mb-2 text-sm font-semibold">{card.title}</h5>
              <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/sugerir-emprendimiento?category=${card.category}`}>{card.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
