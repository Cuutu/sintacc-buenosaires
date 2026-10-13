import type { BreadcrumbItem } from "@/components/seo/Breadcrumbs"
import { EditorialArticle } from "@/components/seo/EditorialArticle"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export type FaqItem = { question: string; answer: string }

type InstitutionalPageProps = {
  breadcrumbs: BreadcrumbItem[]
  eyebrow?: string
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
  eyebrow,
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
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <EditorialArticle
        breadcrumbs={breadcrumbs}
        eyebrow={eyebrow}
        h1={h1}
        intro={intro}
        meta={
          updatedAt ? (
            <>
              Actualizado: <time dateTime={updatedAt}>{formatDateAr(updatedAt)}</time>
            </>
          ) : undefined
        }
        faqs={faqs}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
      >
        {children}
      </EditorialArticle>
    </>
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
