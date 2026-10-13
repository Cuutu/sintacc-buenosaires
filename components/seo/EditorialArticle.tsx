import Link from "next/link"
import { ArrowRight, Map as MapIcon } from "lucide-react"
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/Breadcrumbs"

export type EditorialFaq = { question: string; answer: string }

export const EXPLORE_LINKS = [
  { href: "/sin-gluten-argentina", label: "Lugares sin gluten por ciudad" },
  { href: "/mapa", label: "Mapa interactivo" },
  { href: "/guias", label: "Guías para celíacos" },
  { href: "/comprar-productos-sin-tacc", label: "Dónde comprar productos Sin TACC" },
  { href: "/por-que-usar-celimap", label: "Por qué usar CeliMap" },
  { href: "/listas", label: "Listas públicas" },
] as const

type CtaLinkProps = { href: string; className: string; children: React.ReactNode }

type Cta = {
  href: string
  label: string
  /**
   * Otro componente de link (p. ej. TrackAnalyticsClick para guide_to_map_click). Se pasa
   * desde la página para que este layout no cargue analítica en páginas que no la usan.
   */
  renderLink?: (props: CtaLinkProps) => React.ReactNode
}

function CtaLink({ cta, className, children }: { cta: Cta; className: string; children: React.ReactNode }) {
  if (cta.renderLink) return <>{cta.renderLink({ href: cta.href, className, children })}</>
  return (
    <Link href={cta.href} className={className}>
      {children}
    </Link>
  )
}

type EditorialArticleProps = {
  breadcrumbs: BreadcrumbItem[]
  /** Volanta en Fraunces itálica sobre el título. */
  eyebrow?: string
  h1: string
  intro: string
  meta?: React.ReactNode
  /** Aviso arriba del cuerpo (por ejemplo, "Borrador"). */
  notice?: React.ReactNode
  children: React.ReactNode
  faqs?: EditorialFaq[]
  /** Bloques después de las preguntas (fuentes, ciudades relacionadas…). */
  after?: React.ReactNode
  primaryCta?: Cta
  secondaryCta?: Cta
}

/**
 * Página de lectura "Edición": título grande, texto en una columna cómoda y, en la
 * compu, una columna fija a la derecha con el mapa y más lecturas.
 */
export function EditorialArticle({
  breadcrumbs,
  eyebrow = "tu mapa sin gluten",
  h1,
  intro,
  meta,
  notice,
  children,
  faqs = [],
  after,
  primaryCta = { href: "/mapa", label: "Explorar el mapa" },
  secondaryCta = { href: "/sugerir", label: "Recomendar un lugar" },
}: EditorialArticleProps) {
  return (
    <div className="container mx-auto max-w-5xl px-4 pb-14 pt-8 md:px-5 md:pb-20 md:pt-12">
      <Breadcrumbs items={breadcrumbs} />

      <header className="mt-6 max-w-3xl md:mt-9">
        <p className="font-serif text-lg font-medium italic text-[#B84420] md:text-xl">{eyebrow}</p>
        <h1 className="mt-1 text-[34px] font-extrabold leading-[1.04] tracking-[-0.035em] text-olive [text-wrap:balance] md:text-[50px]">
          {h1}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#5E6A60] [text-wrap:pretty] md:text-xl">
          {intro}
        </p>
        {meta ? <p className="mt-4 text-sm font-semibold text-[#5E6A60]">{meta}</p> : null}
      </header>

      {notice}

      <div className="mt-9 border-t border-[#E2DACB] pt-9 md:mt-12 md:pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-16">
        <div className="min-w-0 max-w-[680px]">
          <div className="celi-prose">{children}</div>

          {faqs.length > 0 ? (
            <section className="mt-14" aria-labelledby="faq-heading">
              <h2
                id="faq-heading"
                className="text-[22px] font-extrabold tracking-[-0.02em] text-olive md:text-[26px]"
              >
                Preguntas frecuentes
              </h2>
              <dl className="mt-4 border-b border-[#E2DACB]">
                {faqs.map((faq) => (
                  <div key={faq.question} className="border-t border-[#E2DACB] py-5">
                    <dt className="text-[17px] font-extrabold leading-snug text-olive">{faq.question}</dt>
                    <dd className="mt-2 text-[15.5px] leading-relaxed text-[#5E6A60]">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {after}
        </div>

        <aside className="mt-14 lg:mt-0" aria-label="Más de CeliMap">
          <div className="space-y-5 lg:sticky lg:top-[calc(var(--desktop-nav-clearance)+1.5rem)]">
            <div className="celi-trigo-crema rounded-[26px] bg-[#2D4A34] p-6 text-[#F7F3EB]">
              <MapIcon className="h-6 w-6 text-[#F7F3EB]/80" strokeWidth={1.8} aria-hidden />
              <p className="mt-3 font-serif text-[26px] font-medium italic leading-[1.05] tracking-[-0.01em]">
                Encontrá dónde comer sin gluten cerca tuyo.
              </p>
              <CtaLink
                cta={primaryCta}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-[16px] bg-[#F7F3EB] px-4 text-[15px] font-extrabold text-[#2D4A34] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D4A34]"
              >
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </CtaLink>
              <CtaLink
                cta={secondaryCta}
                className="mt-3 block text-center text-sm font-bold text-[#F7F3EB]/85 underline decoration-[#F7F3EB]/35 underline-offset-4 hover:text-white"
              >
                {secondaryCta.label}
              </CtaLink>
            </div>

            <nav aria-labelledby="explore-heading" className="px-1">
              <h2 id="explore-heading" className="font-serif text-lg font-medium italic text-[#B84420]">
                Seguí explorando
              </h2>
              <ul className="mt-2 border-b border-[#E2DACB]">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.href} className="border-t border-[#E2DACB]">
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between gap-3 py-3 text-[15px] font-bold text-olive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
                    >
                      <span className="group-hover:underline group-hover:decoration-olive/30 group-hover:underline-offset-4">
                        {link.label}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  )
}
