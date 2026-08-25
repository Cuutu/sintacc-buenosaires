import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/Breadcrumbs"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export type FaqItem = { question: string; answer: string }

type InstitutionalPageProps = {
  breadcrumbs: BreadcrumbItem[]
  h1: string
  intro: string
  updatedAt?: string
  children: React.ReactNode
  faqs: FaqItem[]
  jsonLd: Record<string, unknown> | Record<string, unknown>[]
  primaryCta?: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
}

export function InstitutionalPage({
  breadcrumbs,
  h1,
  intro,
  updatedAt,
  children,
  faqs,
  jsonLd,
  primaryCta = { href: "/mapa", label: "Explorar el mapa" },
  secondaryCta = { href: "/sugerir", label: "Recomendar un lugar" },
}: InstitutionalPageProps) {
  const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd]

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Breadcrumbs items={breadcrumbs} />

      <h1 className="mt-6 mb-4 text-3xl font-bold tracking-tight md:text-4xl">{h1}</h1>
      <p className="mb-4 text-lg leading-8 text-muted-foreground">{intro}</p>
      {updatedAt ? (
        <p className="mb-8 text-sm text-muted-foreground">
          Actualizado: <time dateTime={updatedAt}>{formatDateAr(updatedAt)}</time>
        </p>
      ) : (
        <div className="mb-8" />
      )}

      <div className="prose-institutional space-y-8 text-base leading-7 text-foreground/90">
        {children}
      </div>

      <section className="mt-12" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-4 text-xl font-semibold">
          Preguntas frecuentes
        </h2>
        <dl className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border bg-card p-4">
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">Seguí explorando</h2>
        <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
          <li>
            <Link href="/sin-gluten-argentina" className="text-primary hover:underline">
              Lugares sin gluten por ciudad
            </Link>
          </li>
          <li>
            <Link href="/mapa" className="text-primary hover:underline">
              Mapa interactivo
            </Link>
          </li>
          <li>
            <Link href="/guias" className="text-primary hover:underline">
              Guías para celíacos
            </Link>
          </li>
          <li>
            <Link href="/comprar-productos-sin-tacc" className="text-primary hover:underline">
              Dónde comprar productos Sin TACC
            </Link>
          </li>
          <li>
            <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
              Por qué usar CeliMap
            </Link>
          </li>
          <li>
            <Link href="/listas" className="text-primary hover:underline">
              Listas públicas
            </Link>
          </li>
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

export function buildWebPageJsonLd(opts: {
  name: string
  description: string
  path: string
  faqs: FaqItem[]
}) {
  const url = `${BASE_URL}${opts.path}`
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: "es-AR",
    isPartOf: { "@type": "WebSite", name: "CeliMap", url: BASE_URL },
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: opts.name, item: url },
    ],
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: opts.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }

  return [webPage, breadcrumb, faq]
}

function formatDateAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
