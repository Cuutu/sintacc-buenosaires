import { getBaseUrl } from "@/lib/base-url"
import { getPublicStatsSafe } from "@/lib/stats/get-public-stats"
import { getHomeFeaturedPlaces } from "@/lib/home/get-home-featured-places"
import type { Metadata } from "next"
import { CELIMAP_DESCRIPTION_SHORT, CELIMAP_NAME } from "@/lib/seo/brand"
import { OG_IMAGE, OG_IMAGE_PATH } from "@/lib/seo/og"
import { FAQ_ITEMS, FaqSection } from "@/components/home/FaqSection"
import Link from "next/link"
import { ArrowRight, MapPin, Plus } from "lucide-react"
import { SearchBar } from "@/components/search-bar"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { HeroPins } from "@/components/home/HeroPins"
import { floorDisplayCount, formatFlooredPrefix } from "@/lib/stats/floor-display-count"
import { HomeGuides } from "@/components/home/HomeGuides"
import { HomeSuggestBand } from "@/components/home/HomeSuggestBand"
import { CategoryChips } from "@/components/home/CategoryChips"
import { HomeFeatured } from "@/components/home/HomeFeatured"
import { HowItWorks } from "@/components/home/HowItWorks"
import { CommunityBand } from "@/components/home/CommunityBand"
import { TakeCeliMapWithYou } from "@/components/home/TakeCeliMapWithYou"
import { HomeDirectoryLinks } from "@/components/home/HomeDirectoryLinks"
import { EmprendimientosSection } from "@/components/home/EmprendimientosSection"

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: "Mapa para celíacos en Argentina",
  description: CELIMAP_DESCRIPTION_SHORT,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: CELIMAP_NAME,
    url: BASE_URL,
    title: "Mapa para celíacos en Argentina | CeliMap",
    description: CELIMAP_DESCRIPTION_SHORT,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa para celíacos en Argentina | CeliMap",
    description: CELIMAP_DESCRIPTION_SHORT,
    images: [OG_IMAGE_PATH],
  },
  alternates: { canonical: BASE_URL },
}

export default async function HomePage() {
  const [initialStats, featuredPlaces] = await Promise.all([
    getPublicStatsSafe(),
    getHomeFeaturedPlaces(),
  ])

  const placesFloor = floorDisplayCount(initialStats?.placesCount)
  const heroSubline = placesFloor
    ? `${formatFlooredPrefix(placesFloor)} lugares sin gluten recomendados por la comunidad celíaca.`
    : "Lugares sin gluten recomendados por la comunidad celíaca."

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

      {/* Hero "Edición": oliva con mapa nocturno estático (sin Mapbox) y pines de marca.
          Nada depende de la hora ni del usuario: seguro para ISR. */}
      <section className="celi-hero-mapa relative overflow-hidden min-[769px]:-mt-[var(--desktop-nav-clearance)] min-[769px]:pt-[var(--desktop-nav-clearance)]">
        <HeroPins />
        <div className="container relative mx-auto max-w-5xl px-5 pb-[52px] pt-[max(1rem,calc(var(--safe-area-top)+0.5rem))] md:pb-24 md:pt-10">
          {/* En desktop la navbar ya muestra logo y "Sugerir lugar". */}
          <div className="flex items-center justify-between min-[769px]:hidden">
            <BrandLogo inverse size="sm" />
            <Link
              href="/sugerir"
              aria-label="Sugerir un lugar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#F7F3EB]/30 bg-[#1F3527]/45 text-[#F7F3EB] transition-colors hover:bg-[#1F3527]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60"
            >
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
            </Link>
          </div>

          <div className="h-[112px] md:h-[150px]" aria-hidden />

          <div className="max-w-[680px]">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#F7F3EB]/[0.72]">
              MAPA SIN TACC · ARGENTINA
            </p>
            <h1 className="mt-2.5 max-w-[340px] text-[36px] [text-wrap:balance] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#F7F3EB] md:max-w-none md:text-6xl">
              Encontrá lugares sin gluten{" "}
              <span className="block font-serif text-[46px] font-medium italic leading-[1.05] tracking-[-0.03em] text-[#F0956A] md:text-7xl">
                con confianza.
              </span>
            </h1>
            <p className="mt-3 max-w-[340px] text-[15px] leading-relaxed text-[#F7F3EB]/80 md:hidden">
              {heroSubline}
            </p>
            <p className="mt-4 max-w-[560px] text-lg leading-relaxed text-[#F7F3EB]/80 max-md:sr-only">
              CeliMap es un mapa colaborativo Sin TACC en Argentina. Restaurantes, cafeterías y panaderías recomendados por la comunidad celíaca.
            </p>

            <Link
              href="/mapa"
              data-testid="home-open-map"
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#F7F3EB] px-6 text-base font-extrabold text-[#2D4A34] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.55)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D4A34] sm:w-auto"
            >
              <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden />
              Abrir el mapa
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Buscador montado sobre el borde del hero (debajo del CTA: el CTA va primero). */}
      <div className="relative z-10 mx-auto -mt-[30px] w-full max-w-5xl px-4 md:-mt-8 md:px-5">
        <div className="max-w-[760px]">
          <SearchBar />
        </div>
      </div>

      <div className="mt-6 md:mt-10">
        <CategoryChips />
      </div>

      <TakeCeliMapWithYou />

      <section className="px-4 pb-4 pt-10 md:px-5 md:py-16">
        {/* px-0: el container de Tailwind suma 2rem y duplicaba el margen lateral (24 vs 58 px). */}
        <div className="container mx-auto max-w-6xl px-0">
          <HomeFeatured places={featuredPlaces.length ? featuredPlaces : undefined} />
        </div>
      </section>

      <HomeGuides />

      <HomeSuggestBand />

      <HomeDirectoryLinks />

      <section className="px-4 py-8 md:py-16">
        <div className="container mx-auto max-w-5xl">
          <EmprendimientosSection />
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
