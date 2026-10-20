import Link from "next/link"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"
import { homeBtn, homeSection } from "@/components/home/home-ui"
import {
  Beer,
  Coffee,
  Croissant,
  IceCream,
  ShoppingBasket,
  Utensils,
  type LucideIcon,
} from "lucide-react"
import { CITIES, CATEGORIES, getCityBySlug, getTop10CitySlugs } from "@/lib/seo/cities"
import { ExploreChip } from "./ExploreChip"
import { cn } from "@/lib/utils"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  restaurantes: Utensils,
  panaderias: Croissant,
  cafes: Coffee,
  heladerias: IceCream,
  tiendas: ShoppingBasket,
  bares: Beer,
}

const CATEGORY_LINKS = CATEGORIES.filter((c) => c.slug !== "otros").map((c) => ({
  href: `/${c.slug}-sin-gluten`,
  label: `${c.name} sin gluten`,
  Icon: CATEGORY_ICONS[c.slug],
}))

/** Nombres cortos para que no se desarme la grilla. */
const SHORT_CITY_NAMES: Record<string, string> = {
  "San Miguel de Tucumán": "Tucumán",
}

/** En el celular se ven 6 ciudades (las 10 ocupaban casi una pantalla). */
const MOBILE_CITIES = 6

export function HomeDirectoryLinks({ cityCounts = {} }: { cityCounts?: Record<string, number> }) {
  const cities = getTop10CitySlugs()
    .map((slug) => getCityBySlug(slug) ?? CITIES.find((c) => c.slug === slug))
    .filter((city): city is NonNullable<typeof city> => Boolean(city))

  return (
    <section className={homeSection} aria-labelledby="directory-heading">
      {/* px-0: mismo borde que Guías y Destacados (el container de Tailwind suma 2rem). */}
      <div className="container mx-auto max-w-5xl px-0">
        <HomeSectionHeader
          id="directory-heading"
          title="Explorá por tipo y ciudad"
          description="Restaurantes, bares, panaderías y más, en las ciudades con más opciones sin TACC."
          className="mb-0 md:mb-0"
        />

        <h3
          id="directory-types-heading"
          className="mt-8 mb-4 text-lg font-semibold text-olive"
        >
          Por tipo de lugar
        </h3>
        <ul
          aria-labelledby="directory-types-heading"
          className="grid grid-cols-2 gap-3 lg:grid-cols-3"
        >
          {CATEGORY_LINKS.map((cat) => {
            const Icon = cat.Icon
            return (
              <li key={cat.href} className="min-h-[44px] min-w-0">
                <ExploreChip
                  href={cat.href}
                  align="start"
                  icon={
                    Icon ? <Icon className="h-5 w-5" strokeWidth={1.75} /> : null
                  }
                >
                  {cat.label}
                </ExploreChip>
              </li>
            )
          })}
        </ul>

        <h3
          id="directory-cities-heading"
          className="mt-12 mb-4 text-lg font-semibold text-olive md:mt-14"
        >
          Ciudades principales
        </h3>
        <ul
          aria-labelledby="directory-cities-heading"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          {cities.map((city, index) => {
            const count = cityCounts[city.slug]
            return (
              <li
                key={city.slug}
                className={cn("min-h-[44px] min-w-0", index >= MOBILE_CITIES && "hidden md:block")}
              >
                <ExploreChip href={`/sin-gluten/${city.slug}`}>
                  <span className="block font-bold">{SHORT_CITY_NAMES[city.name] ?? city.name}</span>
                  {count ? (
                    <span className="block text-xs text-[#5E6A60]">
                      {count.toLocaleString("es-AR")} {count === 1 ? "lugar" : "lugares"}
                    </span>
                  ) : null}
                </ExploreChip>
              </li>
            )
          })}
        </ul>
        <p className="mt-3">
          <Link href="/sin-gluten-argentina" className={homeBtn.link}>
            Ver todas las ciudades
          </Link>
        </p>
      </div>
    </section>
  )
}
