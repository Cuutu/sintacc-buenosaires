import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ChefHat, Cake, MapPin, Wheat } from "lucide-react"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"
import { homeBtn } from "@/components/home/home-ui"
import { VentureCategoryIcon } from "@/components/ventures/venture-category-icon"
import type { HomeVenture } from "@/lib/home/get-home-ventures"
import { cn } from "@/lib/utils"

/** Si no llegan emprendimientos (Mongo caído o catálogo vacío), quedan las categorías. */
const FALLBACK_CATEGORIES = [
  { icon: ChefHat, title: "Viandas", href: "/emprendimientos/viandas-sin-gluten" },
  { icon: Cake, title: "Pastelería", href: "/emprendimientos/pasteleria-sin-gluten" },
  { icon: Wheat, title: "Panificados", href: "/emprendimientos/panificados-sin-gluten" },
] as const

/** Tarjeta de un emprendimiento: foto o logo, nombre, qué vende y zona. */
function HomeVentureCard({ venture, className }: { venture: HomeVenture; className?: string }) {
  return (
    <li className={cn("min-w-0", className)}>
      <Link
        href={venture.href}
        className="group flex h-full flex-col rounded-[20px] bg-white p-2 shadow-[0_14px_34px_-26px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(31,42,34,0.55),0_0_0_1px_rgba(45,74,52,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F7F3EB]"
      >
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-[14px]",
            venture.photo ? "bg-olive/10" : "celi-trigo-crema flex items-center justify-center bg-[#2D4A34]"
          )}
        >
          {venture.photo ? (
            <Image
              src={venture.photo}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 45vw, 240px"
            />
          ) : (
            <VentureCategoryIcon category={venture.category} className="h-9 w-9 text-[#F7F3EB]/80" />
          )}
        </div>
        <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
          <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-olive">{venture.name}</h3>
          {venture.sells ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-[#4D6554]">{venture.sells}</p>
          ) : null}
          {venture.zone ? (
            <p className="mt-auto flex min-w-0 items-center gap-1 pt-2 text-xs font-bold text-[#5E6A60]">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate" title={venture.zone}>
                {venture.zone}
              </span>
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  )
}

/**
 * Emprendimientos sin local (revisión 20/10): hasta cuatro reales, con foto, qué venden
 * y zona, en vez de tres íconos. En el celular van de a dos; si son impares, el último
 * se ve solo en compu para no dejar un hueco.
 */
export function EmprendimientosSection({ ventures = [] }: { ventures?: HomeVenture[] }) {
  const showVentures = ventures.length >= 2

  return (
    <section aria-labelledby="home-ventures-heading">
      <HomeSectionHeader
        id="home-ventures-heading"
        kicker="sin local a la calle"
        title="Emprendimientos sin gluten"
        description="Marcas y cocineros que venden por encargo, delivery o redes sociales."
      />

      {showVentures ? (
        <ul
          className={cn(
            "grid grid-cols-2 gap-3 md:gap-4",
            ventures.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"
          )}
          data-testid="home-ventures"
        >
          {ventures.map((venture, index) => (
            <HomeVentureCard
              key={venture.id}
              venture={venture}
              className={ventures.length % 2 === 1 && index === ventures.length - 1 ? "hidden md:block" : undefined}
            />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {FALLBACK_CATEGORIES.map((card) => (
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
      )}

      <div className="mt-5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/emprendimientos" className={cn(homeBtn.secondary, "w-full sm:w-auto sm:min-w-[240px]")}>
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
