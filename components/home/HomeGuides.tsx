import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getPublishedGuides } from "@/lib/seo/guides"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"

const MAX_GUIDES = 3

/** Guías publicadas (lib/seo/guides.ts) como índice editorial. Los números 01/02/03
 *  quedan para "Cómo funciona", que sí es una secuencia. */
export function HomeGuides() {
  const guides = getPublishedGuides().slice(0, MAX_GUIDES)
  if (guides.length === 0) return null

  return (
    <section aria-labelledby="home-guides-heading" className="px-4 py-10 md:px-5 md:py-16">
      <div className="container mx-auto max-w-5xl px-0">
        <HomeSectionHeader
          id="home-guides-heading"
          kicker="para comer afuera"
          title="Guías para celíacos"
          action={
            <Link
              href="/guias"
              className="inline-flex min-h-[44px] items-center text-sm font-extrabold text-olive underline decoration-olive/30 underline-offset-4 hover:text-[#B84420]"
            >
              Ver todas
            </Link>
          }
        />

        <ul className="border-b border-[#E2DACB]">
          {guides.map((guide) => (
            <li key={guide.slug} className="border-t border-[#E2DACB]">
              <Link
                href={`/guias/${guide.slug}`}
                className="group grid grid-cols-[1fr_24px] items-center gap-3 py-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
              >
                <span className="text-[17px] font-extrabold leading-snug text-olive group-hover:underline group-hover:decoration-olive/30 group-hover:underline-offset-4">
                  {guide.title}
                </span>
                <ArrowRight className="h-5 w-5 text-olive transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
