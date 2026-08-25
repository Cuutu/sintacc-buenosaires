import type { Metadata } from "next"
import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { Button } from "@/components/ui/button"
import { getPublishedGuides, getAllGuides } from "@/lib/seo/guides"
import { isDraftGuidePreviewEnv } from "@/lib/seo/guide-access"
import { CELIMAP_NAME } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

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
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Breadcrumbs items={[{ label: "Guías" }]} />
      <h1 className="mt-6 mb-4 text-3xl font-bold tracking-tight md:text-4xl">
        Guías para celíacos
      </h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Artículos prácticos sobre cómo leer las fichas de CeliMap y qué preguntar al comer
        afuera.
      </p>

      {published.length === 0 ? (
        <p className="mb-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Todavía no hay guías publicadas. Mientras tanto podés explorar el{" "}
          <Link href="/mapa" className="text-primary hover:underline">
            mapa
          </Link>{" "}
          o leer{" "}
          <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
            cómo trabajamos la información
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-4">
          {published.map((guide) => (
            <li key={guide.slug} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">
                <Link href={`/guias/${guide.slug}`} className="hover:text-primary">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{guide.summary}</p>
            </li>
          ))}
        </ul>
      )}

      {drafts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-amber-700 dark:text-amber-400">
            Borradores (solo desarrollo / preview)
          </h2>
          <ul className="space-y-3">
            {drafts.map((guide) => (
              <li key={guide.slug} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <Link href={`/guias/${guide.slug}`} className="font-medium hover:underline">
                  {guide.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">No indexable · no aparece en producción</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/mapa">Explorar el mapa</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/como-verificamos-los-lugares">Metodología de datos</Link>
        </Button>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        También:{" "}
        <Link href="/que-es-celimap" className="text-primary hover:underline">
          qué es CeliMap
        </Link>
        ,{" "}
        <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
          por qué usarlo
        </Link>{" "}
        y{" "}
        <Link href="/comprar-productos-sin-tacc" className="text-primary hover:underline">
          dónde comprar productos Sin TACC
        </Link>
        .
      </p>
    </main>
  )
}
