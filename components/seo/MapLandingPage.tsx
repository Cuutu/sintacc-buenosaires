import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowRight, CheckCircle2 } from "lucide-react"
import { CITIES } from "@/lib/seo/cities"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

type MapLandingPageProps = {
  h1: string
  intro: string
  canonicalPath: string
  metaTitle: string
  metaDescription: string
  faq: Array<{ question: string; answer: string }>
  keywordParagraphs: string[]
  crossLink?: { href: string; label: string }
}

export function MapLandingJsonLd({
  canonicalPath,
  metaTitle,
  metaDescription,
  faq,
}: Pick<MapLandingPageProps, "canonicalPath" | "metaTitle" | "metaDescription" | "faq">) {
  const url = `${BASE_URL}${canonicalPath}`
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle,
    description: metaDescription,
    url,
    isPartOf: { "@type": "WebSite", name: "Celimap", url: BASE_URL },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

export function MapLandingPage({
  h1,
  intro,
  canonicalPath,
  metaTitle,
  metaDescription,
  faq,
  keywordParagraphs,
  crossLink,
}: MapLandingPageProps) {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      <MapLandingJsonLd
        canonicalPath={canonicalPath}
        metaTitle={metaTitle}
        metaDescription={metaDescription}
        faq={faq}
      />

      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Celimap</p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{h1}</h1>
      <p className="mb-8 text-muted-foreground leading-relaxed">{intro}</p>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="min-h-[48px] gap-2">
          <Link href="/mapa">
            <MapPin className="h-5 w-5" />
            Abrir mapa interactivo
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="min-h-[48px] gap-2">
          <Link href="/sin-gluten-argentina">
            Ver por ciudad
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="mb-10 space-y-4">
        {keywordParagraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-sm text-muted-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Ciudades con más lugares sin tacc</h2>
        <div className="flex flex-wrap gap-2">
          {CITIES.slice(0, 8).map((city) => (
            <Link
              key={city.slug}
              href={`/sin-gluten/${city.slug}`}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {city.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-border/60 bg-card/40 p-6">
        <h2 className="mb-4 text-lg font-semibold">¿Por qué usar Celimap?</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {[
            "Mapa interactivo con filtros por tipo, barrio y nivel de seguridad",
            "Reseñas reales de la comunidad celíaca",
            "Lugares verificados en Buenos Aires, La Plata, Tucumán, Córdoba y más",
            "Gratis, sin registro para explorar",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border pt-8">
        <h2 className="mb-4 text-lg font-semibold">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.question}>
              <h3 className="mb-1 font-medium">{item.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {crossLink ? (
        <p className="mt-10 text-sm text-muted-foreground">
          ¿Llegaste por otra búsqueda?{" "}
          <Link href={crossLink.href} className="text-primary hover:underline">
            {crossLink.label}
          </Link>
          .
        </p>
      ) : null}
    </main>
  )
}
