import Link from "next/link"
import { ArrowRight, ChefHat, Cake, Wheat } from "lucide-react"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"
import { homeBtn } from "@/components/home/home-ui"
import { cn } from "@/lib/utils"

const CARDS = [
  {
    icon: ChefHat,
    title: "Viandas",
    href: "/emprendimientos/viandas-sin-gluten",
  },
  {
    icon: Cake,
    title: "Pastelería",
    href: "/emprendimientos/pasteleria-sin-gluten",
  },
  {
    icon: Wheat,
    title: "Panificados",
    href: "/emprendimientos/panificados-sin-gluten",
  },
] as const

/** Emprendimientos sin local: tres accesos compactos en fila y los dos botones. */
export function EmprendimientosSection() {
  return (
    <section aria-labelledby="home-ventures-heading">
      <HomeSectionHeader
        id="home-ventures-heading"
        kicker="sin local a la calle"
        title="Emprendimientos sin gluten"
        description="Marcas y cocineros que venden por encargo, delivery o redes sociales."
      />

      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {CARDS.map((card) => (
          <li key={card.href} className="min-w-0">
            <Link
              href={card.href}
              className="flex h-full min-h-[84px] flex-col items-center justify-center gap-2 rounded-[16px] border border-[#E6DFD2] bg-white px-2 py-3 text-center transition-colors hover:border-olive/30 hover:bg-[#FBF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30 sm:flex-row sm:gap-3 sm:px-4"
            >
              <card.icon className="h-6 w-6 shrink-0 text-[#B84420]" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-extrabold leading-tight text-olive">{card.title}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/emprendimientos" className={cn(homeBtn.secondary, "w-full sm:w-[240px]")}>
          Ver emprendimientos
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </Link>
        <Link href="/sugerir-emprendimiento" className={homeBtn.link}>
          Sugerir un emprendimiento
        </Link>
      </div>
    </section>
  )
}
