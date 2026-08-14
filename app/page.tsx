import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  MapPin, ArrowRight, Shield,
  Star, ChevronRight, HeartHandshake,
} from "lucide-react"
import { StatsRow } from "@/components/home/StatsRow"
import { FeaturedSection } from "@/components/featured/FeaturedSection"
import { FeaturedListsSection } from "@/components/home/FeaturedListsSection"
import { EmprendimientosSection } from "@/components/home/EmprendimientosSection"
import { FaqSection } from "@/components/home/FaqSection"
import { ScrollReveal } from "@/components/scroll-reveal"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"
import { getBaseUrl } from "@/lib/base-url"
import { getPublicStatsSafe } from "@/lib/stats/get-public-stats"
import { CELIMAP_DESCRIPTION_SHORT } from "@/lib/seo/brand"
import { FAQ_ITEMS } from "@/components/home/FaqSection"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { BrandBadge } from "@/components/brand/BrandBadge"
import { HeroBackdrop } from "@/components/home/HeroBackdrop"

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
  const initialStats = await getPublicStatsSafe()

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
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col justify-center">
        <HeroBackdrop />

        <div className="container mx-auto px-4 pt-8 pb-12 md:pt-20 md:pb-20 max-w-5xl">
          <div className="flex justify-center mb-8">
            <BrandLogo size="lg" />
          </div>

          <h1 className="mb-5 text-center font-display text-[1.85rem] font-extrabold leading-[1.12] tracking-tight text-olive sm:text-4xl sm:leading-[1.08] md:text-5xl lg:text-6xl">
            Encontrá lugares sin gluten
            <br />
            <span className="text-olive">con confianza</span>
          </h1>

          <p className="text-center font-serif italic text-lg md:text-xl text-terracotta max-w-2xl mx-auto mb-3">
            tu mapa sin gluten
          </p>

          <p className="text-center text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Restaurantes, cafés y panaderías en Argentina. Lugares aportados y
            actualizados por la comunidad celíaca.
          </p>

          <div className="max-w-xl mx-auto mb-8">
            <SearchBar />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto min-h-[52px] text-base px-8"
            >
              <Link href="/mapa" className="flex items-center gap-2">
                <MapPin className="h-5 w-5" strokeWidth={1.75} />
                Abrir el mapa
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-h-[52px] text-base px-8"
            >
              <Link href="/sugerir" className="flex items-center gap-2">
                Sugerir un lugar
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>

          <div className="mb-12 flex flex-wrap justify-center gap-2">
            <BrandBadge variant="dedicated" />
            <BrandBadge variant="options" />
            <BrandBadge variant="community" />
          </div>

          <StatsRow initialStats={initialStats} />
        </div>
      </section>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 text-olive">
                Tan fácil como abrir el mapa
              </h2>
              <p className="text-sm text-muted-foreground">
                Diseñado para celíacos que quieren encontrar opciones con más contexto
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: <MapPin className="h-6 w-6 text-olive" strokeWidth={1.7} />,
                  title: "Abrí el mapa",
                  desc: "Buscá por barrio, ciudad o activá tu ubicación. Lugares sin TACC en Argentina.",
                  href: "/mapa",
                  cta: "Ir al mapa →",
                },
                {
                  icon: <Shield className="h-6 w-6 text-olive" strokeWidth={1.7} />,
                  title: "Consultá la clasificación del lugar",
                  desc: "Revisá si figura como 100% libre de gluten o con opciones sin TACC, y las experiencias disponibles. Confirmá siempre en el local.",
                  href: "/como-verificamos-los-lugares",
                  cta: "Cómo trabajamos la información →",
                },
                {
                  icon: <Star className="h-6 w-6 text-olive" strokeWidth={1.7} />,
                  title: "Revisá la información y las experiencias",
                  desc: "Cuando hay reseñas de la comunidad o datos de Google en la ficha, usalos como guía — no como garantía.",
                  href: null,
                  cta: null,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="relative rounded-[24px] border border-olive/10 bg-card p-6 shadow-soft hover:border-olive/20 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-olive/8 border border-olive/10 flex items-center justify-center mb-5">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-bold text-base mb-2 text-olive">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                  {item.href && item.cta && (
                    <Link
                      href={item.href}
                      className="inline-flex items-center text-xs text-terracotta font-semibold mt-4 hover:gap-2 gap-1 transition-all"
                    >
                      {item.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section id="lugares" className="border-t border-olive/10 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold mb-2 text-olive">
                ¿Qué estás buscando?
              </h2>
              <p className="text-sm text-muted-foreground">
                Filtrá por tipo de lugar directo desde acá
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Restaurantes", href: "/mapa?type=restaurant" },
                { label: "Cafés", href: "/mapa?type=cafe" },
                { label: "Panaderías", href: "/mapa?type=bakery" },
                { label: "Tiendas", href: "/mapa?type=store" },
                { label: "Heladerías", href: "/mapa?type=icecream" },
                { label: "Bares", href: "/mapa?type=bar" },
              ].map((cat) => (
                <Link key={cat.href} href={cat.href}>
                  <div className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-olive/10 bg-card hover:border-terracotta/40 hover:bg-accent transition-all duration-200 cursor-pointer shadow-soft">
                    <span className="text-sm font-semibold text-olive">{cat.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-olive/40 ml-1" strokeWidth={1.75} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
            <EmprendimientosSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section id="listas" className="border-t border-olive/10 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedListsSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="relative overflow-hidden rounded-[24px] bg-olive-organic px-8 py-14 text-center">
              <div className="relative">
                <div className="inline-flex items-center gap-2 text-cream/80 mb-4">
                  <HeartHandshake className="h-5 w-5" strokeWidth={1.7} />
                  <span className="text-sm font-semibold uppercase tracking-widest">
                    Comunidad
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-extrabold mb-3 text-cream">
                  ¿Conocés un lugar sin gluten?
                </h2>
                <p className="text-cream/70 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  Ayudá a otros celíacos sumando el lugar al mapa. Lleva 2 minutos y la comunidad te lo agradece.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-[52px] px-8"
                  >
                    <Link href="/sugerir" className="flex items-center gap-2">
                      Sugerir un lugar
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-[52px] px-8 border-cream text-cream bg-transparent hover:bg-cream/10"
                  >
                    <Link href="/mapa">Ver el mapa</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl text-center">
            <h2 className="font-display text-lg font-semibold mb-3 text-olive">
              El mapa para celíacos que la comunidad elige
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              CeliMap reúne restaurantes, cafés, panaderías y heladerías aptas para celíacos en Argentina.
              Cada lugar tiene reseñas, nivel de seguridad y datos de contacto.
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-olive/10">
          <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
            <h2 className="text-base font-semibold mb-4 text-center text-muted-foreground">
              Lugares sin gluten por ciudad
            </h2>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {CITIES.slice(0, 8).map((city) => (
                <Link
                  key={city.slug}
                  href={`/sin-gluten/${city.slug}`}
                  className="text-sm text-olive hover:text-terracotta hover:underline"
                >
                  {city.name === "Buenos Aires"
                    ? "Restaurantes sin gluten en Buenos Aires"
                    : `Lugares sin gluten en ${city.name}`}
                </Link>
              ))}
            </div>
            <h2 className="text-base font-semibold mb-4 text-center text-muted-foreground">
              Por tipo de lugar
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.filter((c) => c.slug !== "otros").map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/${cat.slug}-sin-gluten`}
                  className="text-sm text-olive hover:text-terracotta hover:underline"
                >
                  {cat.name} sin gluten
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <FaqSection />
      <p className="container mx-auto max-w-2xl px-4 pb-10 text-center text-sm text-muted-foreground">
        <Link href="/como-verificamos-los-lugares" className="text-olive hover:text-terracotta hover:underline">
          Cómo trabajamos la información de los lugares
        </Link>
        {" · "}
        <Link href="/que-es-celimap" className="text-olive hover:text-terracotta hover:underline">
          Qué es CeliMap
        </Link>
      </p>
    </div>
  )
}
