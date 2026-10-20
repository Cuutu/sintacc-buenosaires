import Link from "next/link"
import { ArrowRight, ChefHat, Cake, Wheat } from "lucide-react"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"

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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/emprendimientos"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-olive px-6 text-[15px] font-extrabold text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2 sm:w-[240px]"
        >
          Ver emprendimientos
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </Link>
        <Link
          href="/sugerir-emprendimiento"
          className="inline-flex h-12 items-center justify-center rounded-[16px] border border-olive/25 px-6 text-[15px] font-extrabold text-olive transition-colors hover:bg-olive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30 sm:w-[240px]"
        >
          Sugerir emprendimiento
        </Link>
      </div>
    </section>
  )
}
