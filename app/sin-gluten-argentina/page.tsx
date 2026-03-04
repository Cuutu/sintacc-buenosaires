import Link from "next/link"
import { Metadata } from "next"
import { getArgentinaLandingTitle, getArgentinaLandingDescription } from "@/lib/seo/templates"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"

export const revalidate = 3600

export const metadata: Metadata = {
  title: getArgentinaLandingTitle(),
  description: getArgentinaLandingDescription(),
}

export default function SinGlutenArgentinaPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl md:text-4xl font-bold mb-6">
        Lugares sin gluten en Argentina
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina.
        Mapa de lugares celíacos verificados por la comunidad.
      </p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Por ciudad</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/sin-gluten/${city.slug}`}
              className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <span className="font-medium">{city.name}</span>
              <span className="text-muted-foreground text-sm block">{city.province}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Por categoría</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.slug !== "otros").map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}-sin-gluten`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium"
            >
              {cat.emoji} {cat.name} sin gluten
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
