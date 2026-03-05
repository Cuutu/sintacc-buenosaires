import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { getCiudadSEOData } from "@/lib/seo/ciudades-data"
import { getCityBySlug } from "@/lib/seo/cities"
import { getTop10CitySlugs } from "@/lib/seo/cities"
import { Button } from "@/components/ui/button"
import { PlusCircle, MapPin } from "lucide-react"

const CATEGORIES_PREVIEW = [
  { emoji: "🍽️", label: "Restaurantes sin gluten" },
  { emoji: "🥐", label: "Panaderías y pastelerías sin TACC" },
  { emoji: "🛒", label: "Dietéticas y almacenes naturales" },
  { emoji: "🍦", label: "Heladerías con opciones sin gluten" },
  { emoji: "☕", label: "Cafés aptos para celíacos" },
  { emoji: "📍", label: "Otros establecimientos sin TACC" },
]

const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://www.celimap.com.ar"

interface EmptyCityPageProps {
  citySlug: string
}

export function EmptyCityPage({ citySlug }: EmptyCityPageProps) {
  const city = getCityBySlug(citySlug)
  const data = getCiudadSEOData(citySlug)

  if (!city) return null

  const nombre = data?.nombre ?? city.name
  const provincia = data?.provincia ?? city.province
  const descripcion =
    data?.descripcion ??
    `Encontrá restaurantes, panaderías, dietéticas y heladerías aptas para celíacos en ${city.name}. Celimap es el mapa colaborativo donde la comunidad celíaca comparte sus experiencias sin TACC.`
  const poblacion = data?.poblacion ?? ""
  const zonasTipicas = data?.zonasTipicas ?? city.neighborhoods?.slice(0, 6) ?? []

  const faqs = [
    {
      q: `¿Hay lugares sin TACC en ${nombre}?`,
      a: `Celimap está construyendo el mapa colaborativo de lugares sin gluten en ${nombre}. Podés ser el primero en agregar un lugar desde el botón "Sugerir lugar".`,
    },
    {
      q: "¿Cómo sé si un lugar es seguro para celíacos?",
      a: "En Celimap cada lugar tiene reseñas de la comunidad celíaca que indican si tiene cocina separada, si el personal está capacitado y si los productos están certificados sin TACC.",
    },
    {
      q: `¿Cómo agrego un lugar sin TACC en ${nombre}?`,
      a: "Podés sugerir un lugar desde el botón \"Sugerir lugar\". El equipo de Celimap verifica la información antes de publicarlo en el mapa.",
    },
  ]

  const topCities = getTop10CitySlugs().filter((s) => s !== citySlug).slice(0, 6)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sin gluten Argentina",
        item: `${BASE_URL}/sin-gluten-argentina`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Sin gluten ${nombre}`,
        item: `${BASE_URL}/sin-gluten/${citySlug}`,
      },
    ],
  }

  return (
    <div className="container py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: nombre },
        ]}
      />

      {/* Hero */}
      <section className="mb-12 pt-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
          Lugares sin TACC en {nombre} — Guía para celíacos
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed mb-6">
          Encontrá restaurantes, panaderías, dietéticas y heladerías aptas para
          celíacos en {nombre}. Celimap es el mapa colaborativo donde la comunidad
          celíaca comparte sus experiencias y recomendaciones sin TACC.
        </p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/sugerir">
            <PlusCircle className="h-5 w-5" />
            ¿Conocés un lugar sin TACC en {nombre}? Agregalo al mapa
          </Link>
        </Button>
      </section>

      {/* Qué vas a encontrar */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          ¿Qué vas a encontrar acá?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl">
          Cuando la comunidad complete el mapa de {nombre}, vas a poder filtrar por:
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES_PREVIEW.map((cat) => (
            <li
              key={cat.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-medium">
                {cat.label} en {nombre}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA principal */}
      <section className="mb-12 p-6 rounded-xl bg-primary/10 border border-primary/20">
        <h2 className="text-lg font-semibold mb-2">Ayudá a la comunidad celíaca</h2>
        <p className="text-muted-foreground mb-4 max-w-2xl">
          ¿Conocés un lugar sin TACC en {nombre}? Agregalo al mapa y ayudá a otros
          celíacos a encontrar opciones seguras. Solo tomá unos minutos para
          compartir la información.
        </p>
        <Button asChild>
          <Link href="/sugerir" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Sugerir un lugar
          </Link>
        </Button>
      </section>

      {/* Bloque informativo local */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Sobre {nombre}</h2>
        <p className="text-muted-foreground max-w-3xl leading-relaxed mb-4">
          {descripcion}
        </p>
        {poblacion && (
          <p className="text-sm text-muted-foreground mb-4">
            {nombre} ({provincia}) — {poblacion}
          </p>
        )}
        {zonasTipicas.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Zonas típicas:</p>
            <p className="text-sm text-muted-foreground">
              {zonasTipicas.join(", ")}
            </p>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-border pb-4 last:border-0">
              <h3 className="font-medium mb-2">{faq.q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Links internos */}
      <section className="pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-4">
          Otras ciudades con mapa celíaco
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Explorá lugares sin gluten en otras ciudades de Argentina:
        </p>
        <ul className="flex flex-wrap gap-2">
          {topCities.map((slug) => {
            const c = getCityBySlug(slug)
            if (!c) return null
            return (
              <li key={slug}>
                <Link
                  href={`/sin-gluten/${slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-sm font-medium transition-colors"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {c.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
