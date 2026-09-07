import Link from "next/link"
import { VENTURE_AR_ZONE_LANDINGS } from "@/lib/venture-argentina"
import { SuggestVentureCta } from "./SuggestVentureCta"

export function VentureExploreSections() {
  return (
    <div className="space-y-8 border-t border-[#E8E1D6] pt-10">
      <section aria-labelledby="explore-zone-heading">
        <h2 id="explore-zone-heading" className="mb-3 text-sm font-semibold text-[#5F6B63]">
          Por zona
        </h2>
        <ul className="flex flex-wrap gap-2">
          {VENTURE_AR_ZONE_LANDINGS.map((z) => (
            <li key={z.slug}>
              <Link
                href={`/emprendimientos/${z.slug}`}
                className="inline-flex h-11 items-center rounded-full border border-[#E8E1D6] bg-white px-4 text-sm font-semibold text-[#1F4D35] hover:border-[#1F4D35]/30"
              >
                {z.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border border-[#E8E1D6] bg-[#FDFBF7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
        aria-labelledby="suggest-venture-heading"
      >
        <div>
          <h2 id="suggest-venture-heading" className="text-base font-semibold text-[#1F4D35]">
            ¿Falta un emprendimiento?
          </h2>
          <p className="mt-1 text-sm text-[#5F6B63]">Lo revisamos antes de publicarlo.</p>
        </div>
        <SuggestVentureCta />
      </section>
    </div>
  )
}
