import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChefHat, Cake, Wheat } from "lucide-react"

const CARDS = [
  {
    icon: ChefHat,
    title: "Viandas sin gluten",
    href: "/emprendimientos/viandas-sin-gluten",
  },
  {
    icon: Cake,
    title: "Pastelería y tortas",
    href: "/emprendimientos/pasteleria-sin-gluten",
  },
  {
    icon: Wheat,
    title: "Panificados y productos",
    href: "/emprendimientos/panificados-sin-gluten",
  },
] as const

export function EmprendimientosSection() {
  return (
    <div className="text-center">
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        También podés descubrir emprendimientos
      </h2>
      <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
        No todos los lugares sin gluten tienen local. En Celimap también podés encontrar marcas,
        cocineros y proyectos que venden productos aptos por encargo, delivery o redes sociales.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-white/8 bg-white/[0.025] hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 h-full">
              <card.icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{card.title}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" className="min-h-[48px] gap-2">
          <Link href="/emprendimientos">
            Ver emprendimientos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="min-h-[48px]">
          <Link href="/sugerir-emprendimiento">Sugerir emprendimiento</Link>
        </Button>
      </div>
    </div>
  )
}
