"use client"

import { VentureCard, type VentureCardData } from "./VentureCard"

export function pickFeaturedVentures(ventures: VentureCardData[], max = 5): VentureCardData[] {
  return ventures.filter((v) => v.photos?.[0]).slice(0, max)
}

export function VentureFeaturedRail({ ventures }: { ventures: VentureCardData[] }) {
  const featured = pickFeaturedVentures(ventures)
  if (featured.length === 0) return null

  return (
    <section className="mb-12" aria-labelledby="featured-ventures-heading">
      <h2
        id="featured-ventures-heading"
        className="mb-4 px-5 text-lg font-semibold text-[#1F4D35] md:px-0"
      >
        Emprendimientos destacados
      </h2>
      <div
        className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
        data-overflow-allowed="venture-featured"
      >
        {featured.map((venture) => (
          <VentureCard key={venture._id} venture={venture} featured />
        ))}
      </div>
    </section>
  )
}
