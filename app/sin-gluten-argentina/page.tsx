import Link from "next/link"
import { Metadata } from "next"
import { getArgentinaLandingTitle, getArgentinaLandingDescription } from "@/lib/seo/templates"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"
import { PROVINCES } from "@/lib/seo/provinces"
import { getPlacesByProvinceSlug } from "@/lib/seo/places"
import { isProvincePageIndexable } from "@/lib/seo/indexing-rules"
import { ArgentinaLandingJsonLd } from "@/components/seo/ArgentinaLandingJsonLd"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

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
  alternates: { canonical: `${BASE_URL}/sin-gluten-argentina` },
  openGraph: {
    title: getArgentinaLandingTitle(),
    description: getArgentinaLandingDescription(),
    url: `${BASE_URL}/sin-gluten-argentina`,
    type: "website",
  },
}

export default async function SinGlutenArgentinaPage() {
  // Provincias indexables (≥5 lugares y ≥2 localidades)
  const indexableProvinces: { slug: string; name: string; total: number }[] = []
  for (const province of PROVINCES) {
    const { total } = await getPlacesByProvinceSlug(province.slug, { limit: 1 })
    const localities = await getProvinceLocalitiesCount(province.slug)
    if (isProvincePageIndexable(total, localities)) {
      indexableProvinces.push({ slug: province.slug, name: province.name, total })
    }
  }

  return (
    <div className="container py-8">
      <ArgentinaLandingJsonLd cities={CITIES} />
      <h1 className="text-2xl md:text-4xl font-bold mb-6">
        Lugares sin gluten en Argentina
      </h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina.
        Explorá el{" "}
        <Link href="/mapa" className="text-primary hover:underline">
          mapa para celíacos
        </Link>
        .
      </p>

      <section className="mb-12 max-w-2xl">
        <h2 className="text-lg font-semibold mb-3">Restaurantes y lugares aptos celíacos</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Donde comer sin gluten en Buenos Aires, Córdoba, Rosario, Mendoza y más. Restaurantes sin TACC, panaderías sin gluten y cafés con datos aportados por la comunidad.
        </p>
      </section>

      {indexableProvinces.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Lugares sin TACC por provincia</h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {indexableProvinces.map((province) => (
              <Link
                key={province.slug}
                href={`/sin-gluten/provincia/${province.slug}`}
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="font-medium">{province.name}</span>
                <span className="text-muted-foreground text-sm block">{province.total} lugares</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
            <p>
              En Celimap encontrás el mapa de lugares sin gluten en Buenos Aires, Córdoba, Rosario,
              Mendoza y más ciudades. Restaurantes, panaderías y cafés con datos aportados por la
              comunidad.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">¿Hay restaurantes sin TACC en Buenos Aires?</h3>
            <p>
              Sí, hay muchos restaurantes sin gluten en Buenos Aires. Celimap reúne opciones 100%
              libres de gluten y locales con menú adaptado según la información cargada. Confirmá
              siempre en el local.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">¿Cómo encontrar panaderías sin gluten?</h3>
            <p>
              Usá el mapa de Celimap para filtrar por tipo de establecimiento. Hay panaderías
              dedicadas y otras con opciones sin TACC en las principales ciudades de Argentina.
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
            Cómo trabajamos la información
          </Link>
          {" · "}
          <Link href="/guias" className="text-primary hover:underline">
            Guías para celíacos
          </Link>
        </p>
      </section>
    </div>
  )
}

async function getProvinceLocalitiesCount(provinceSlug: string): Promise<number> {
  const { getProvinceLocalities } = await import("@/lib/seo/places")
  const localities = await getProvinceLocalities(provinceSlug)
  return localities.length
}