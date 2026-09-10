import Link from "next/link"
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

export function HomeDirectoryLinks() {
  const cities = getTop10CitySlugs()
    .map((slug) => getCityBySlug(slug) ?? CITIES.find((c) => c.slug === slug))
    .filter((city): city is NonNullable<typeof city> => Boolean(city))

  return (
    <section className="px-4 py-8 md:py-16" aria-labelledby="directory-heading">
      <div className="container mx-auto max-w-5xl">
        <h2
          id="directory-heading"
          className="font-display text-2xl font-bold tracking-[-0.02em] text-olive md:text-3xl"
        >
          Explorá por tipo y ciudad
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4D6554] md:text-base">
          Restaurantes, bares, panaderías y más, en las ciudades con más opciones Sin TACC.
        </p>

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
          {cities.map((city) => (
            <li key={city.slug} className="min-h-[44px] min-w-0">
              <ExploreChip href={`/sin-gluten/${city.slug}`}>{city.name}</ExploreChip>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm">
          <Link
            href="/sin-gluten-argentina"
            className="font-medium text-terracotta underline-offset-4 transition-colors duration-200 hover:text-terracotta-hover hover:underline motion-reduce:transition-none"
          >
            Ver todas las ciudades
          </Link>
        </p>
      </div>
    </section>
  )
}
