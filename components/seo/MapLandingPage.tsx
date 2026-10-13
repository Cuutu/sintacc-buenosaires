import Link from "next/link"
import { EditorialArticle } from "@/components/seo/EditorialArticle"
import { MapPin, ArrowRight, CheckCircle2 } from "lucide-react"
import { CITIES } from "@/lib/seo/cities"
import { getBaseUrl } from "@/lib/base-url"
import { CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"

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
    isPartOf: { "@type": "WebSite", name: "CeliMap", url: BASE_URL },
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
    <>
      <MapLandingJsonLd
        canonicalPath={canonicalPath}
        metaTitle={metaTitle}
        metaDescription={metaDescription}
        faq={faq}
      />
      <EditorialArticle
        breadcrumbs={[{ label: h1 }]}
        eyebrow="el mapa de la comunidad"
        h1={h1}
        intro={intro}
        faqs={faq}
        primaryCta={{ href: "/mapa", label: "Abrir mapa interactivo" }}
        secondaryCta={{ href: "/sin-gluten-argentina", label: "Ver por ciudad" }}
        after={
          crossLink ? (
            <p className="mt-10 text-[15px] text-[#5E6A60]">
              ¿Llegaste por otra búsqueda?{" "}
              <Link
                href={crossLink.href}
                className="font-bold text-[#B84420] underline decoration-[#B84420]/35 underline-offset-[3px]"
              >
                {crossLink.label}
              </Link>
              .
            </p>
          ) : null
        }
      >
        <section>
          <p>
            CeliMap es un mapa colaborativo para encontrar lugares Sin TACC en Argentina.{" "}
            <Link href="/que-es-celimap">Qué es CeliMap</Link>.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mapa"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[#B84420] px-5 text-[15px] font-extrabold !text-white !no-underline transition-colors hover:bg-[#A33B1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84420]/50 focus-visible:ring-offset-2"
            >
              <MapPin className="h-5 w-5" aria-hidden />
              Abrir mapa interactivo
            </Link>
            <Link
              href="/sin-gluten-argentina"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#DDD5C6] bg-white px-5 text-[15px] font-extrabold !text-olive !no-underline transition-colors hover:bg-[#FBF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
            >
              Ver por ciudad
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {keywordParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>

        <section>
          <h2>Ciudades para explorar</h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.slice(0, 8).map((city) => (
              <Link
                key={city.slug}
                href={`/sin-gluten/${city.slug}`}
                className="inline-flex h-9 items-center rounded-full border-[1.5px] border-[#DDD5C6] bg-white px-3.5 text-sm !text-olive !no-underline transition-colors hover:border-olive/40"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2>¿Por qué usar CeliMap?</h2>
          <ul className="space-y-3">
            {[
              "Mapa interactivo con filtros por tipo, barrio y clasificación sin TACC",
              "Reseñas y reportes de la comunidad celíaca cuando existen",
              "Páginas por ciudad en Argentina, además del mapa",
              "Gratis, sin registro para explorar",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#2D4A34]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Más detalle en <Link href="/por-que-usar-celimap">por qué usar CeliMap</Link>. Cómo se
            carga la información: <Link href="/como-verificamos-los-lugares">metodología</Link>.
          </p>
          <p className="mt-4 rounded-[18px] bg-[#F1ECE2] px-5 py-4 text-[15px] leading-relaxed">
            {CELIMAP_SAFETY_DISCLAIMER}
          </p>
        </section>
      </EditorialArticle>
    </>
  )
}
