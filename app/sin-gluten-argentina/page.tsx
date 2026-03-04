import Link from "next/link"
import { Metadata } from "next"
import { getArgentinaLandingTitle, getArgentinaLandingDescription } from "@/lib/seo/templates"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"
import { ArgentinaLandingJsonLd } from "@/components/seo/ArgentinaLandingJsonLd"

export const revalidate = 3600

export const metadata: Metadata = {
  title: getArgentinaLandingTitle(),
  description: getArgentinaLandingDescription(),
  keywords: [
    "lugares sin gluten Argentina",
    "restaurantes aptos celíacos",
    "donde comer sin gluten",
    "mapa celíacos Argentina",
    "sin TACC Buenos Aires",
  ],
}

export default function SinGlutenArgentinaPage() {
  return (
    <div className="container py-8">
      <ArgentinaLandingJsonLd cities={CITIES} />
      <h1 className="text-2xl md:text-4xl font-bold mb-6">
        Lugares sin gluten en Argentina
      </h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina.
        Mapa de lugares celíacos verificados por la comunidad.
      </p>

      <section className="mb-12 max-w-2xl">
        <h2 className="text-lg font-semibold mb-3">Restaurantes y lugares aptos celíacos</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Donde comer sin gluten en Buenos Aires, Córdoba, Rosario, Mendoza y más. Restaurantes sin TACC, panaderías sin gluten y cafés aptos celíacos verificados por la comunidad.
        </p>
      </section>

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

      <section className="mb-12">
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

      <section className="max-w-2xl border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">¿Dónde comer sin gluten en Argentina?</h3>
            <p>En Celimap encontrás el mapa de lugares sin gluten en Buenos Aires, Córdoba, Rosario, Mendoza y más ciudades.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">¿Hay restaurantes sin TACC en Buenos Aires?</h3>
            <p>Sí, hay muchos restaurantes sin gluten en Buenos Aires verificados por la comunidad celíaca.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">¿Cómo encontrar panaderías sin gluten?</h3>
            <p>Usá el mapa de Celimap para filtrar por tipo de establecimiento en tu ciudad.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
