import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { Button } from "@/components/ui/button"
import {
  getGuideBySlug,
  getPublishedGuides,
  type Guide,
} from "@/lib/seo/guides"
import { decideGuideIndexing, decisionToRobots } from "@/lib/seo/indexing-rules"
import { isDraftGuidePreviewEnv } from "@/lib/seo/guide-access"
import { getCityBySlug } from "@/lib/seo/cities"
import { CELIMAP_NAME, CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"
import { TrackPageView } from "@/components/analytics/TrackPageView"
import { authOptions } from "@/lib/auth"
import { TrackAnalyticsClick } from "@/components/analytics/TrackAnalyticsClick"

const BASE_URL = getBaseUrl()

export const dynamicParams = true

/** Solo guías published en static; drafts se resuelven en runtime (admin/preview). */
export function generateStaticParams() {
  return getPublishedGuides().map((g) => ({ slug: g.slug }))
}

async function canAccessDraftGuide(): Promise<boolean> {
  if (isDraftGuidePreviewEnv()) return true
  const session = await getServerSession(authOptions)
  return session?.user?.role === "admin"
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return { title: "Guía no encontrada" }

  if (guide.status === "draft") {
    const allowed = await canAccessDraftGuide()
    if (!allowed) {
      return { title: "No encontrado", robots: { index: false, follow: false } }
    }
    // Preview/admin: sin OG enriquecido
    return {
      title: `[Borrador] ${guide.title}`,
      description: "Borrador interno — no indexar.",
      robots: { index: false, follow: false },
    }
  }

  const canonical = `${BASE_URL}/guias/${guide.slug}`
  const robots = decisionToRobots(decideGuideIndexing(guide.status))

  return {
    title: guide.title,
    description: guide.summary,
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      title: `${guide.title} | ${CELIMAP_NAME}`,
      description: guide.summary,
      url: canonical,
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: [guide.author],
      ...(guide.image ? { images: [{ url: guide.image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | ${CELIMAP_NAME}`,
      description: guide.summary,
    },
  }
}

function GuideArticleJsonLd({ guide }: { guide: Guide }) {
  if (guide.status !== "published") return null

  const url = `${BASE_URL}/guias/${guide.slug}`
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.summary,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: { "@type": "Organization", name: guide.author },
    publisher: {
      "@type": "Organization",
      name: CELIMAP_NAME,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/CelimapLOGO.png` },
    },
    mainEntityOfPage: url,
    inLanguage: "es-AR",
    ...(guide.image ? { image: `${BASE_URL}${guide.image}` } : {}),
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Guías", item: `${BASE_URL}/guias` },
      { "@type": "ListItem", position: 3, name: guide.title, item: url },
    ],
  }

  const faq =
    guide.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}
    </>
  )
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  if (guide.status === "draft") {
    const allowed = await canAccessDraftGuide()
    if (!allowed) notFound()
  }

  const relatedCities =
    guide.status === "published"
      ? guide.relatedCitySlugs.map((s) => getCityBySlug(s)).filter(Boolean)
      : []

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      <TrackPageView
        event="guide_page_view"
        properties={{ slug: guide.slug, status: guide.status }}
      />
      <GuideArticleJsonLd guide={guide} />
      <Breadcrumbs
        items={[
          { label: "Guías", href: "/guias" },
          { label: guide.title },
        ]}
      />

      {guide.status === "draft" && (
        <p
          className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          role="status"
        >
          Borrador — solo visible en desarrollo, preview o sesión admin. No indexar.
        </p>
      )}

      <h1 className="mt-6 mb-3 text-3xl font-bold tracking-tight md:text-4xl">
        {guide.title}
      </h1>
      <p className="mb-4 text-lg text-muted-foreground">{guide.summary}</p>
      <p className="mb-8 text-sm text-muted-foreground">
        Por {guide.author} · Actualizado{" "}
        <time dateTime={guide.updatedAt}>
          {new Intl.DateTimeFormat("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(guide.updatedAt))}
        </time>
      </p>

      <div className="space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
            <p className="leading-7 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>

      {guide.faqs.length > 0 && (
        <section className="mt-10" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="mb-4 text-xl font-semibold">
            Preguntas frecuentes
          </h2>
          <dl className="space-y-4">
            {guide.faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-border bg-card p-4">
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {guide.sources.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Fuentes</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {guide.sources.map((s) => (
              <li key={s.label}>
                {s.url ? (
                  <Link href={s.url} className="text-primary hover:underline">
                    {s.label}
                  </Link>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedCities.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Ciudades relacionadas</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {relatedCities.map((city) =>
              city ? (
                <li key={city.slug}>
                  <Link
                    href={`/sin-gluten/${city.slug}`}
                    className="text-primary hover:underline"
                  >
                    Sin TACC en {city.name}
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <TrackAnalyticsClick
            event="guide_to_map_click"
            properties={{ slug: guide.slug }}
            href="/mapa"
          >
            Explorar el mapa
          </TrackAnalyticsClick>
        </Button>
        <Button asChild variant="outline">
          <TrackAnalyticsClick event="suggest_place_click" href="/sugerir">
            Recomendar un lugar
          </TrackAnalyticsClick>
        </Button>
      </div>
    </main>
  )
}
