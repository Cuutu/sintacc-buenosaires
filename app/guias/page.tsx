import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { EditorialArticle } from "@/components/seo/EditorialArticle"
import { getPublishedGuides, getAllGuides } from "@/lib/seo/guides"
import { isDraftGuidePreviewEnv } from "@/lib/seo/guide-access"
import { CELIMAP_NAME } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"
import { OG_IMAGE } from "@/lib/seo/og"

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: "Guías para celíacos",
  description:
    "Guías prácticas de CeliMap sobre lugares sin TACC, opciones aptas y hábitos al comer afuera.",
  alternates: { canonical: `${BASE_URL}/guias` },
  openGraph: {
    title: `Guías para celíacos | ${CELIMAP_NAME}`,
    description:
      "Guías prácticas sobre clasificaciones sin TACC y hábitos al comer afuera.",
    url: `${BASE_URL}/guias`,
    type: "website",
    images: [OG_IMAGE],
  },
  // Hub indexable solo cuando haya al menos una guía published
  robots:
    getPublishedGuides().length > 0
      ? { index: true, follow: true }
      : { index: false, follow: true },
}

export default function GuiasIndexPage() {
  const published = getPublishedGuides()
  const showDraftPreview = isDraftGuidePreviewEnv()
  const drafts = showDraftPreview
    ? getAllGuides().filter((g) => g.status === "draft")
    : []

  return (
    <EditorialArticle
      breadcrumbs={[{ label: "Guías" }]}
      eyebrow="para comer afuera"
      h1="Guías para celíacos"
      intro="Artículos prácticos sobre cómo leer las fichas de CeliMap y qué preguntar al comer afuera."
      secondaryCta={{ href: "/como-verificamos-los-lugares", label: "Metodología de datos" }}
      after={
        <p className="mt-10 text-[15px] leading-relaxed text-[#5E6A60]">
          También:{" "}
          <Link href="/que-es-celimap" className="font-bold text-[#B84420] underline decoration-[#B84420]/35 underline-offset-[3px]">
            qué es CeliMap
          </Link>
          ,{" "}
          <Link href="/por-que-usar-celimap" className="font-bold text-[#B84420] underline decoration-[#B84420]/35 underline-offset-[3px]">
            por qué usarlo
          </Link>{" "}
          y{" "}
          <Link href="/comprar-productos-sin-tacc" className="font-bold text-[#B84420] underline decoration-[#B84420]/35 underline-offset-[3px]">
            dónde comprar productos Sin TACC
          </Link>
          .
        </p>
      }
    >
      {published.length === 0 ? (
        <p>
          Todavía no hay guías publicadas. Mientras tanto podés explorar el{" "}
          <Link href="/mapa">mapa</Link> o leer{" "}
          <Link href="/como-verificamos-los-lugares">cómo trabajamos la información</Link>.
        </p>
      ) : (
        <ol className="border-b border-[#E2DACB]">
          {published.map((guide, i) => (
            <li key={guide.slug} className="border-t border-[#E2DACB]">
              <Link
                href={`/guias/${guide.slug}`}
                className="group grid grid-cols-[56px_1fr_24px] items-start gap-2 py-5 !font-normal !no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
              >
                <span className="font-serif text-[36px] italic leading-none text-[#B84420]" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[19px] font-extrabold leading-snug text-olive group-hover:underline group-hover:decoration-olive/30 group-hover:underline-offset-4">
                    {guide.title}
                  </span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-[#5E6A60]">{guide.summary}</span>
                </span>
                <ArrowRight className="mt-1 h-5 w-5 text-olive transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="!text-amber-700">Borradores (solo desarrollo / preview)</h2>
          <ul className="space-y-3">
            {drafts.map((guide) => (
              <li key={guide.slug} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <Link href={`/guias/${guide.slug}`}>{guide.title}</Link>
                <p className="mt-1 text-xs">No indexable · no aparece en producción</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </EditorialArticle>
  )
}
