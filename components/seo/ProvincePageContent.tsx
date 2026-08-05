import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { ProvincialMapEmbed } from "@/components/seo/ProvincialMapEmbed"
import { ProvincialPlaceCard } from "@/components/seo/ProvincialPlaceCard"
import { ProvincePageJsonLd } from "@/components/seo/ProvincePageJsonLd"
import type { ProvincePageData } from "@/lib/seo/province-pages"
import { getProvinceTitle, getProvinceDescription, getProvinceSEOTextBlock } from "@/lib/seo/templates"
import { decideProvincePageIndexing } from "@/lib/seo/indexing-rules"
import { CATEGORIES } from "@/lib/seo/cities"
import { ScrollReveal } from "@/components/scroll-reveal"

interface ProvincePageContentProps {
  data: ProvincePageData
}

export function ProvincePageContent({ data }: ProvincePageContentProps) {
  const { province, places, total, dedicatedGfCount, gfOptionsCount, localities, categories, lastUpdated } = data

  const faqs = [
    {
      question: `¿Dónde comer sin TACC en ${province.name}?`,
      answer: `Encontrá restaurantes, cafeterías, panaderías y tiendas sin gluten en toda la provincia de ${province.name} usando el mapa o el listado de Celimap.`,
    },
    {
      question: `¿Hay restaurantes 100% sin gluten en ${province.name}?`,
      answer: dedicatedGfCount > 0
        ? `Sí, hay al menos ${dedicatedGfCount} lugares 100% sin gluten en ${province.name}. Buscá el sello "100% sin gluten" en cada ficha.`
        : `Actualmente no hay lugares 100% sin gluten registrados en ${province.name}. Siempre verificá con el local antes de consumir.`,
    },
    {
      question: `¿Qué localidades de ${province.name} tienen opciones para celíacos?`,
      answer: localities.length > 0
        ? `Las localidades con opciones verificadas son: ${localities.map((l) => l.name).join(", ")}.`
        : `Aún no hay localidades registradas con opciones en ${province.name}.`,
    },
    {
      question: "¿Cómo verificar si un lugar es seguro?",
      answer: "Revisá las etiquetas de cada lugar: \"100% sin gluten\" indica que todo el menú es seguro. \"Opciones sin TACC\" requiere que indiques tu condición al pedir. Leé las reseñas de la comunidad y los reportes de contaminación.",
    },
  ]

  return (
    <div className="container py-8">
      <ProvincePageJsonLd province={province} places={places} />
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: province.name },
        ]}
      />
      <h1 className="text-2xl md:text-4xl font-bold mt-4 mb-4">
        {getProvinceTitle(province)}
      </h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        {getProvinceDescription(province, { total, dedicatedGf: dedicatedGfCount, localities: localities.length })}
      </p>

      {/* Resumen dinámico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">Lugares verificados</div>
        </div>
        {dedicatedGfCount > 0 && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <div className="text-2xl font-bold">{dedicatedGfCount}</div>
            <div className="text-xs text-muted-foreground">100% sin TACC</div>
          </div>
        )}
        {gfOptionsCount > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-2xl font-bold">{gfOptionsCount}</div>
            <div className="text-xs text-muted-foreground">Con opciones sin TACC</div>
          </div>
        )}
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-2xl font-bold">{localities.length}</div>
          <div className="text-xs text-muted-foreground">Localidades</div>
        </div>
        {lastUpdated && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
            <div className="text-xs font-medium text-muted-foreground">Última actualización</div>
            <div className="text-xs text-muted-foreground">
              {new Date(lastUpdated).toLocaleDateString("es-AR")}
            </div>
          </div>
        )}
      </div>

      {/* Mapa */}
      <ScrollReveal>
        <div className="mb-12">
          <ProvincialMapEmbed provinceSlug={province.slug} provinceName={province.name} />
        </div>
      </ScrollReveal>

      {/* Categorías */}
      {categories.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/sin-gluten/provincia/${province.slug}/${cat.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
              >
                {cat.emoji} {cat.name} ({cat.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Localidades */}
      {localities.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Localidades</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {localities.map((loc) => (
              <div key={loc.slug} className="p-3 rounded-lg border border-border bg-card/50">
                <div className="font-medium">
                  {loc.citySlug ? (
                    <Link href={`/sin-gluten/${loc.citySlug}`} className="text-primary hover:underline">
                      {loc.name}
                    </Link>
                  ) : (
                    loc.name
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{loc.count} lugares</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Listado de lugares */}
      {places.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Lugares en {province.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <ProvincialPlaceCard key={place._id} place={place} provinceSlug={province.slug} />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mb-12 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-b border-border pb-4">
              <h3 className="font-medium mb-2">{faq.question}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="p-6 rounded-xl bg-primary/10 border border-primary/20">
        <p className="text-muted-foreground text-sm mb-4">
          ¿Conocés un lugar sin TACC en {province.name} que no aparece? Sumalo a CeliMap.
        </p>
        <Link
          href="/sugerir"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Sugerir un lugar
        </Link>
      </section>
    </div>
  )
}