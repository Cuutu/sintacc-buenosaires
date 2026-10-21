import { getBaseUrl } from "@/lib/base-url"
import { getPublicStatsSafe } from "@/lib/stats/get-public-stats"
import { getHomeFeaturedPlaces } from "@/lib/home/get-home-featured-places"
import { getHomeCityCountsSafe } from "@/lib/home/get-home-city-counts"
import { getHomeVenturesSafe } from "@/lib/home/get-home-ventures"
import { getTop10CitySlugs } from "@/lib/seo/cities"
import type { Metadata } from "next"
import { CELIMAP_DESCRIPTION_SHORT, CELIMAP_NAME } from "@/lib/seo/brand"
import { OG_IMAGE, OG_IMAGE_PATH } from "@/lib/seo/og"
import { FAQ_ITEMS, FaqSection } from "@/components/home/FaqSection"
import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"
import { SearchBar } from "@/components/search-bar"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { HeroPins } from "@/components/home/HeroPins"
import { floorDisplayCount, formatFlooredPrefix } from "@/lib/stats/floor-display-count"
import { HomeGuides } from "@/components/home/HomeGuides"
import { SafetyModeSwitch } from "@/components/home/SafetyModeSwitch"
import { HomeFeatured } from "@/components/home/HomeFeatured"
import { HowItWorks } from "@/components/home/HowItWorks"
import { CommunityBand } from "@/components/home/CommunityBand"
import { TakeCeliMapWithYou } from "@/components/home/TakeCeliMapWithYou"
import { HomeDirectoryLinks } from "@/components/home/HomeDirectoryLinks"
import { EmprendimientosSection } from "@/components/home/EmprendimientosSection"
import { NearMeButton } from "@/components/home/NearMeButton"
import { homeBtn, homeSection } from "@/components/home/home-ui"
import { cn } from "@/lib/utils"

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
  const [initialStats, featuredPlaces, cityCounts, ventures] = await Promise.all([
    getPublicStatsSafe(),
    getHomeFeaturedPlaces(),
    getHomeCityCountsSafe(getTop10CitySlugs()),
    getHomeVenturesSafe(),
  ])

  const placesFloor = floorDisplayCount(initialStats?.placesCount)
  const placesPrefix = placesFloor ? formatFlooredPrefix(placesFloor) : null
  const heroSubline = placesPrefix
    ? `${placesPrefix} lugares sin gluten recomendados por la comunidad celíaca.`
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
          Nada depende de la hora ni del usuario: seguro para ISR.
          Revisión 20/10: la acción principal es buscar (o "Cerca mío"); "Abrir el mapa"
          queda como link. Antes había ~9 acciones arriba del pliegue. */}
      <section className="celi-hero-mapa relative overflow-hidden min-[769px]:-mt-[var(--desktop-nav-clearance)] min-[769px]:pt-[var(--desktop-nav-clearance)]">
        <HeroPins />
        <div className="container relative mx-auto max-w-5xl px-5 pb-10 pt-[max(1rem,calc(var(--safe-area-top)+0.5rem))] md:pb-20 md:pt-10">
          {/* En el celular, "Sugerir" ya está en la barra de abajo; en compu, en la de arriba. */}
          <div className="min-[769px]:hidden">
            <BrandLogo inverse size="sm" />
          </div>

          <div className="h-[96px] md:h-[150px]" aria-hidden />

          <div className="max-w-[680px]">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#F7F3EB]/[0.72]">
              MAPA SIN TACC · ARGENTINA
            </p>
            <h1 className="mt-2.5 max-w-[340px] text-[36px] [text-wrap:balance] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#F7F3EB] md:max-w-none md:text-6xl">
              Encontrá lugares sin gluten{" "}
              <span className="block font-serif text-[46px] font-medium italic leading-[1.05] tracking-[-0.03em] text-[#F0956A] md:text-7xl">
                con confianza.
              </span>
            </h1>
            <p className="mt-3 max-w-[340px] text-base leading-relaxed text-[#F7F3EB]/80 md:hidden">
              {heroSubline}
            </p>
            <p className="mt-4 max-w-[560px] text-lg leading-relaxed text-[#F7F3EB]/80 max-md:sr-only">
              {placesPrefix
                ? `CeliMap es un mapa colaborativo sin TACC con ${placesPrefix} lugares en Argentina. `
                : "CeliMap es un mapa colaborativo sin TACC en Argentina. "}
              Restaurantes, cafeterías y panaderías recomendados por la comunidad celíaca.
            </p>

            <div className="mt-6 max-w-[640px]">
              <SearchBar />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <NearMeButton />
                {/* Modo "Solo 100% sin TACC": preferencia del dispositivo, se lee después de montar. */}
                <SafetyModeSwitch variant="chip" />
              </div>
              <Link href="/mapa" data-testid="home-open-map" className={cn(homeBtn.linkOnDark, "mt-1")}>
                <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
                o abrí el mapa
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Orden (revisión 20/10): destacados → cómo funciona (explica 100% vs. opciones,
          lo que diferencia a CeliMap) → explorar → emprendimientos → guías → comunidad
          (único llamado a sugerir, con las apps) → preguntas frecuentes. */}
      <section className={homeSection}>
        {/* px-0: el container de Tailwind suma 2rem y duplicaba el margen lateral (24 vs 58 px). */}
        <div className="container mx-auto max-w-5xl px-0">
          <HomeFeatured places={featuredPlaces.length ? featuredPlaces : undefined} />
        </div>
      </section>

      <section className={homeSection}>
        <div className="container mx-auto max-w-5xl px-0">
          <HowItWorks />
        </div>
      </section>

      <HomeDirectoryLinks cityCounts={cityCounts} />

      <section className={homeSection}>
        <div className="container mx-auto max-w-5xl px-0">
          <EmprendimientosSection ventures={ventures} />
        </div>
      </section>

      <HomeGuides />

      <div className="my-8 md:my-12">
        <CommunityBand stats={initialStats}>
          <TakeCeliMapWithYou variant="band" />
        </CommunityBand>
      </div>

      <FaqSection />
    </div>
  )
}
