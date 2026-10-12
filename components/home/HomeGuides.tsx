import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getPublishedGuides } from "@/lib/seo/guides"

const MAX_GUIDES = 3

/** Guías publicadas (lib/seo/guides.ts) como índice editorial numerado. */
export function HomeGuides() {
  const guides = getPublishedGuides().slice(0, MAX_GUIDES)
  if (guides.length === 0) return null

  return (
    <section aria-labelledby="home-guides-heading" className="px-4 py-10 md:px-5 md:py-16">
      <div className="container mx-auto max-w-5xl px-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-serif text-lg font-medium italic text-[#B84420]">para comer afuera</p>
            <h2
              id="home-guides-heading"
              className="mt-0.5 text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] text-olive md:text-4xl"
            >
              Guías para celíacos
            </h2>
          </div>
          <Link
            href="/guias"
            className="shrink-0 text-sm font-extrabold text-olive underline decoration-olive/30 underline-offset-4 hover:text-[#B84420]"
          >
            Ver todas
          </Link>
        </div>

        <ol className="mt-5 border-b border-[#E2DACB]">
          {guides.map((guide, i) => (
            <li key={guide.slug} className="border-t border-[#E2DACB]">
              <Link
                href={`/guias/${guide.slug}`}
                className="group grid grid-cols-[52px_1fr_24px] items-center gap-2 py-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
              >
                <span className="font-serif text-[34px] font-normal italic leading-none text-[#B84420]" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[17px] font-extrabold leading-snug text-olive group-hover:underline group-hover:decoration-olive/30 group-hover:underline-offset-4">
                  {guide.title}
                </span>
                <ArrowRight className="h-5 w-5 text-olive transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
