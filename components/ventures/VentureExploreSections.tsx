import Link from "next/link"
import {
  VENTURE_CATEGORY_LANDINGS,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"
import { VentureCategoryIcon } from "./venture-category-icon"

export function VentureExploreSections() {
  return (
    <div className="space-y-12">
      <section aria-labelledby="explore-category-heading">
        <h2
          id="explore-category-heading"
          className="mb-5 text-lg font-semibold text-[#1F4D35]"
        >
          Explorá por categoría
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {VENTURE_CATEGORY_LANDINGS.map((c) => (
            <Link
              key={c.slug}
              href={`/emprendimientos/${c.slug}`}
              className="flex min-h-[108px] flex-col items-start justify-between rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1F4D35]/8 text-[#1F4D35]">
                <VentureCategoryIcon category={c.categoryId} className="h-5 w-5" />
              </span>
              <span className="mt-3 text-base font-semibold text-[#1F4D35]">{c.h1.replace(" sin gluten", "")}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="explore-zone-heading">
        <h2 id="explore-zone-heading" className="mb-5 text-lg font-semibold text-[#1F4D35]">
          Por zona
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {VENTURE_ZONE_LANDINGS.map((z) => (
            <Link
              key={z.slug}
              href={`/emprendimientos/${z.slug}`}
              className="flex min-h-[72px] items-center justify-center rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] px-4 py-5 text-center text-base font-semibold text-[#1F4D35] transition-transform hover:-translate-y-0.5"
            >
              {z.label}
            </Link>
          ))}
        </div>
      </section>

      <section
        className="rounded-[24px] border border-[#E8E1D6] bg-[#F8F5EF] px-5 py-10 md:px-10 md:py-16"
        aria-labelledby="publish-venture-heading"
      >
        <h2
          id="publish-venture-heading"
          className="max-w-xl font-display text-[1.75rem] font-semibold leading-tight text-[#1F4D35] md:text-[2rem]"
        >
          ¿Tenés un emprendimiento sin gluten?
        </h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-[#5F6B63]">
          Publicá tu emprendimiento en CeliMap y llegá a miles de personas que buscan productos sin
          gluten todos los días.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sugerir-emprendimiento"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-[#C85A2E] px-6 text-base font-bold text-[#F8F5EF] hover:bg-[#B44F27]"
          >
            Publicar emprendimiento
          </Link>
          <Link
            href="/como-funciona"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl border-2 border-[#1F4D35] px-6 text-base font-semibold text-[#1F4D35] hover:bg-[#1F4D35]/5"
          >
            Cómo funciona
          </Link>
        </div>
      </section>
    </div>
  )
}
