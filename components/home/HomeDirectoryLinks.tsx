import Link from "next/link"
import { CITIES, CATEGORIES, getCityBySlug, getTop10CitySlugs } from "@/lib/seo/cities"

const CATEGORY_LINKS = CATEGORIES.filter((c) => c.slug !== "otros").map((c) => ({
  href: `/${c.slug}-sin-gluten`,
  label: `${c.name} sin gluten`,
  emoji: c.emoji,
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
          className="font-display text-2xl font-bold text-olive md:text-3xl"
        >
          Explorá por tipo y ciudad
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4D6554] md:text-base">
          Restaurantes, bares, panaderías y más, en las ciudades con más opciones Sin TACC.
        </p>

        <h3 className="mt-8 mb-3 text-lg font-semibold text-olive">Por tipo de lugar</h3>
        <ul className="flex flex-wrap gap-2">
          {CATEGORY_LINKS.map((cat) => (
            <li key={cat.href}>
              <Link
                href={cat.href}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#D9DED4] bg-white px-4 text-sm font-medium text-[#2D4A34] transition-colors hover:border-olive/35 hover:bg-[#F6F1E8]"
              >
                <span aria-hidden>{cat.emoji}</span>
                {cat.label}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mt-10 mb-3 text-lg font-semibold text-olive">Ciudades principales</h3>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/sin-gluten/${city.slug}`}
                className="block rounded-[16px] border border-olive/10 bg-cream-card px-4 py-3 text-sm font-semibold text-olive transition-colors hover:border-olive/25 hover:bg-[#F6F1E8]"
              >
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/sin-gluten-argentina" className="font-medium text-olive underline-offset-2 hover:underline">
            Ver todas las ciudades
          </Link>
        </p>
      </div>
    </section>
  )
}
