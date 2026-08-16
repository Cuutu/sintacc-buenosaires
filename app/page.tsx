import { SearchBar } from "@/components/search-bar"
import Link from "next/link"
import { MapPin, PlusCircle } from "lucide-react"
import { getBaseUrl } from "@/lib/base-url"
import { getPublicStatsSafe } from "@/lib/stats/get-public-stats"
import { getHomeFeaturedPlaces } from "@/lib/home/get-home-featured-places"
import { CELIMAP_DESCRIPTION_SHORT } from "@/lib/seo/brand"
import { FAQ_ITEMS, FaqSection } from "@/components/home/FaqSection"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { HeroBackdrop } from "@/components/home/HeroBackdrop"
import { HeroMetrics } from "@/components/home/HeroMetrics"
import { CategoryChips } from "@/components/home/CategoryChips"
import { HomeFeatured } from "@/components/home/HomeFeatured"
import { HowItWorks } from "@/components/home/HowItWorks"
import { CommunityBand } from "@/components/home/CommunityBand"
import { TakeCeliMapWithYou } from "@/components/home/TakeCeliMapWithYou"

const BASE_URL = getBaseUrl()

export const metadata = {
  title: "Mapa para celíacos en Argentina",
  description: CELIMAP_DESCRIPTION_SHORT,
  openGraph: {
    title: "Mapa para celíacos en Argentina | CeliMap",
    description: CELIMAP_DESCRIPTION_SHORT,
    url: BASE_URL,
  },
  alternates: { canonical: BASE_URL },
}

export default async function HomePage() {
  const [initialStats, featuredPlaces] = await Promise.all([
    getPublicStatsSafe(),
    getHomeFeaturedPlaces(),
  ])

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="relative overflow-hidden md:min-h-[58vh] md:flex md:flex-col md:justify-center min-[769px]:-mt-[var(--desktop-nav-clearance)] min-[769px]:pt-[var(--desktop-nav-clearance)]">
        <HeroBackdrop />
        <div className="container mx-auto max-w-5xl px-4 pb-6 pt-[max(2.75rem,calc(var(--safe-area-top)+1.5rem))] md:py-8">
          <div className="mx-auto flex w-full max-w-[760px] flex-col items-center">
            <div className="mb-4 md:mb-10">
              <BrandLogo size="lg" />
            </div>

            <h1 className="mb-2 max-w-[760px] text-center font-display text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#2D4A34] sm:mb-4 sm:text-5xl md:text-6xl">
              Encontrá lugares sin gluten
              <br />
              con confianza
            </h1>

            <p className="mb-4 max-w-[640px] text-center text-sm leading-relaxed text-[#55635A] md:mb-6 md:text-lg">
              Restaurantes, cafeterías y panaderías recomendados por la comunidad celíaca.
            </p>

            <div className="mb-3 w-full min-w-0 md:mb-4">
              <SearchBar />
            </div>

            <div className="mb-3 w-full min-w-0 md:mb-5">
              <CategoryChips />
            </div>

            <div className="mb-4 w-full md:mb-6">
              <HeroMetrics initialStats={initialStats} />
            </div>

            <div className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-[65fr_35fr] md:gap-3">
              <Link
                href="/mapa"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#C85A2E] text-base font-semibold text-white shadow-[0_8px_18px_-10px_rgba(200,90,46,0.5)] transition-colors hover:bg-[#BE552C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A2E]/45 md:h-[52px]"
              >
                <MapPin className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                Abrir el mapa
              </Link>
              <Link
                href="/sugerir"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#4E735B]/50 bg-[#F8F5EF] text-base font-medium text-[#2D4A34] transition-colors hover:bg-[#F3EEE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30 md:h-[52px] md:border-[#4E735B]/40"
              >
                <PlusCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                Sugerir un lugar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <TakeCeliMapWithYou />

      <section className="px-4 py-8 md:py-16">
        <div className="container mx-auto max-w-6xl">
          <HomeFeatured places={featuredPlaces.length ? featuredPlaces : undefined} />
        </div>
      </section>

      <section className="px-4 py-8 md:py-16">
        <div className="container mx-auto max-w-5xl">
          <HowItWorks />
        </div>
      </section>

      <CommunityBand stats={initialStats} />

      <FaqSection />
    </div>
  )
}
