import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChefHat, Cake, Wheat, ArrowRight } from "lucide-react"
import type { VentureCategoryId } from "@/lib/venture-constants"

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

type VenturesEmptyStateProps = {
  hasCategoryFilter: boolean
}

export function VenturesEmptyState({ hasCategoryFilter }: VenturesEmptyStateProps) {
  return (
    <div className="space-y-10">
      <div className="text-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 md:py-16 md:px-10">
        <h3 className="text-lg md:text-xl font-bold mb-3">
          {hasCategoryFilter
            ? "Todavía no hay emprendimientos cargados en esta categoría"
            : "Todavía no hay emprendimientos cargados"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          ¿Conocés alguno? Ayudanos a sumar marcas y proyectos sin gluten para que más personas
          puedan encontrarlos.
        </p>
        <Button asChild size="lg" className="min-h-[48px] gap-2 shadow-lg shadow-primary/20">
          <Link href="/sugerir-emprendimiento">
            Sugerir emprendimiento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground/70 mt-5">
          Las sugerencias se revisan antes de publicarse.
        </p>
      </div>

      <div>
        <h4 className="text-center text-sm font-semibold text-muted-foreground mb-5">
          También podés sugerir por categoría
        </h4>
        <div className="grid sm:grid-cols-3 gap-4">
          {SUGGEST_CARDS.map((card) => (
            <div
              key={card.category}
              className="flex flex-col rounded-xl border border-white/8 bg-white/[0.025] p-5 hover:border-primary/25 hover:bg-primary/5 transition-all"
            >
              <card.icon className="h-7 w-7 text-primary mb-3" aria-hidden />
              <h5 className="font-semibold text-sm mb-2">{card.title}</h5>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                {card.text}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/sugerir-emprendimiento?category=${card.category}`}>
                  {card.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
