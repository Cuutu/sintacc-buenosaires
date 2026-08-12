import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  MapPin, ArrowRight, Sparkles, Shield, Users,
  Star, ChevronRight,
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

const BASE_URL = getBaseUrl()

export const metadata = {
  // title SIN marca: el layout raíz agrega " | CeliMap" una sola vez
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
        <div className="absolute inset-0 -z-10 pointer-events-none" data-overflow-allowed="decoration">
          <div className="celimap-hero-blob absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="celimap-hero-blob absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[100px]" />
          <div className="celimap-hero-blob absolute top-1/2 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, #4ade80 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="celimap-hero-noise" aria-hidden />
        </div>

        <div className="container mx-auto px-4 pt-8 pb-12 md:pt-24 md:pb-20 max-w-5xl">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              El mapa colaborativo para celíacos
            </div>
          </div>

          <h1 className="mb-6 text-center text-[1.75rem] font-extrabold leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.05] md:text-5xl lg:text-6xl xl:text-7xl">
            El mapa para celíacos
            <br />
            de{" "}
            <span className="relative inline-block max-w-full">
              <span className="text-primary">Argentina</span>
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="6"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden
              >
                <path
                  d="M0 5 Q25 1 50 5 Q75 9 100 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/50"
                />
              </svg>
            </span>
          </h1>

          <p className="text-center text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Restaurantes, cafés y panaderías sin tacc en La Plata, Tucumán, Buenos Aires y más.
            Lugares aportados y actualizados por la comunidad.
          </p>

          <div className="max-w-xl mx-auto mb-8">
            <SearchBar />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto min-h-[52px] text-base px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Link href="/mapa" className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Abrir el mapa
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-h-[52px] text-base px-8 border-border/60 hover:bg-accent"
            >
              <Link href="/sugerir" className="flex items-center gap-2">
                Sugerir un lugar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <StatsRow initialStats={initialStats} />

          <div className="mt-8 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {[
              { dot: "bg-emerald-400", text: "Lugares 100% sin gluten" },
              { dot: "bg-amber-400", text: "Opciones aptas" },
              { dot: "bg-sky-400", text: "Buenos Aires, Córdoba y más" },
            ].map((pill) => (
              <span
                key={pill.text}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/75 sm:text-[13px]"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`}
                  aria-hidden
                />
                {pill.text}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground/40 animate-bounce">
          <span className="text-[10px] font-mono uppercase tracking-widest">scroll</span>
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </section>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Tan fácil como abrir el mapa
              </h2>
              <p className="text-sm text-muted-foreground">
                Diseñado para celíacos que quieren encontrar opciones con más contexto
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  step: "01",
                  icon: <MapPin className="h-6 w-6 text-primary" />,
                  title: "Abrí el mapa",
                  desc: "Buscá por barrio, ciudad o activá tu ubicación. Lugares sin TACC en Argentina.",
                  href: "/mapa",
                  cta: "Ir al mapa →",
                },
                {
                  step: "02",
                  icon: <Shield className="h-6 w-6 text-primary" />,
                  title: "Consultá la clasificación del lugar",
                  desc: "Revisá si figura como 100% libre de gluten o con opciones sin TACC, y las experiencias disponibles. Confirmá siempre en el local.",
                  href: "/como-verificamos-los-lugares",
                  cta: "Cómo trabajamos la información →",
                },
                {
                  step: "03",
                  icon: <Star className="h-6 w-6 text-primary" />,
                  title: "Revisá la información y las experiencias",
                  desc: "Cuando hay reseñas de la comunidad o datos de Google en la ficha, usalos como guía — no como garantía.",
                  href: null,
                  cta: null,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-white/8 bg-white/[0.025] p-6 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div className="absolute top-5 right-5 font-mono text-[11px] font-bold text-muted-foreground/30 select-none">
                    {item.step}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                  {item.href && item.cta && (
                    <Link
                      href={item.href}
                      className="inline-flex items-center text-xs text-primary font-semibold mt-4 hover:gap-2 gap-1 transition-all"
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
        <section id="lugares" className="border-t border-border/40 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                ¿Qué estás buscando?
              </h2>
              <p className="text-sm text-muted-foreground">
                Filtrá por tipo de lugar directo desde acá
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { emoji: "🍽️", label: "Restaurantes", href: "/mapa?type=restaurant" },
                { emoji: "☕", label: "Cafés", href: "/mapa?type=cafe" },
                { emoji: "🥐", label: "Panaderías", href: "/mapa?type=bakery" },
                { emoji: "🛒", label: "Tiendas", href: "/mapa?type=store" },
                { emoji: "🍦", label: "Heladerías", href: "/mapa?type=icecream" },
                { emoji: "🍺", label: "Bares", href: "/mapa?type=bar" },
              ].map((cat) => (
                <Link key={cat.href} href={cat.href}>
                  <div className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/8 bg-white/[0.025] hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
            <EmprendimientosSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section id="listas" className="border-t border-border/40 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedListsSection />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent overflow-hidden px-8 py-12 text-center">
              <div
                data-overflow-allowed="decoration"
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-[60px]" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px]" />
              </div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 text-primary mb-4">
                  <Users className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-widest">
                    Comunidad
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
                  ¿Conocés un lugar sin gluten?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  Ayudá a otros celíacos sumando el lugar al mapa. Lleva 2 minutos y la comunidad te lo agradece.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-[52px] px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    <Link href="/sugerir" className="flex items-center gap-2">
                      Sugerir un lugar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="min-h-[52px] px-8 border-border/60">
                    <Link href="/mapa">Ver el mapa</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl text-center">
            <h2 className="text-lg font-semibold mb-3">
              El mapa para celíacos que la comunidad elige
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Celimap reúne restaurantes, cafés, panaderías y heladerías aptas para celíacos en Argentina.
              Cada lugar tiene reseñas, nivel de seguridad y datos de contacto.
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
            <h2 className="text-base font-semibold mb-4 text-center text-muted-foreground">
              Lugares sin gluten por ciudad
            </h2>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {CITIES.slice(0, 8).map((city) => (
                <Link
                  key={city.slug}
                  href={`/sin-gluten/${city.slug}`}
                  className="text-sm text-primary hover:underline"
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
                  className="text-sm text-primary hover:underline"
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
        <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
          Cómo trabajamos la información de los lugares
        </Link>
        {" · "}
        <Link href="/que-es-celimap" className="text-primary hover:underline">
          Qué es CeliMap
        </Link>
      </p>
    </div>
  )
}