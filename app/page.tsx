import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  MapPin, ArrowRight, Sparkles, Shield, Users,
  Star, ChevronRight, CheckCircle2,
} from "lucide-react"
import { StatsRow } from "@/components/home/StatsRow"
import { FeaturedSection } from "@/components/featured/FeaturedSection"
import { FeaturedListsSection } from "@/components/home/FeaturedListsSection"
import { FaqSection } from "@/components/home/FaqSection"
import { ScrollReveal } from "@/components/scroll-reveal"
import { CITIES, CATEGORIES } from "@/lib/seo/cities"

export const metadata = {
  title: "Mapa para celíacos | Lugares sin gluten en Argentina y el mundo",
  description:
    "Mapa para celíacos sin restricciones. Encontrá restaurantes, cafés y panaderías sin TACC en Buenos Aires, Córdoba y toda Argentina. Lugares aptos celíacos verificados por la comunidad.",
  openGraph: {
    title: "Mapa para celíacos | Lugares sin gluten en Argentina",
    description:
      "Encontrá restaurantes, cafés y panaderías sin TACC. Donde comer sin gluten en Buenos Aires, Córdoba y más. Verificados por la comunidad celíaca.",
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* ════════════════════════════════════════════════════
          HERO — full viewport desktop, compacto mobile
      ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col justify-center">

        {/* Background atmosférico en capas (noise solo acá, no en body) */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {/* Blob principal top-right */}
          <div className="celimap-hero-blob absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[120px]" />
          {/* Blob secundario bottom-left */}
          <div className="celimap-hero-blob absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[100px]" />
          {/* Blob accent centro */}
          <div className="celimap-hero-blob absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[80px]" />
          {/* Grid de puntos sutil */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, #4ade80 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="celimap-hero-noise" aria-hidden />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 max-w-5xl">

          {/* Badge de apertura */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              El mapa colaborativo para celíacos
            </div>
          </div>

          {/* H1 — la pieza más importante de la página */}
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Encontrá dónde
            <br />
            comer{" "}
            <span className="relative inline-block">
              <span className="text-primary">sin gluten</span>
              {/* Línea decorativa bajo "sin gluten" */}
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
            <br />
            cerca tuyo
          </h1>

          {/* Subtítulo */}
          <p className="text-center text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Restaurantes, cafés y panaderías sin TACC en Argentina y el mundo.
            Verificados por la comunidad celíaca — con reseñas reales.
          </p>

          {/* Search bar prominente */}
          <div className="max-w-xl mx-auto mb-8">
            <SearchBar />
          </div>

          {/* CTAs */}
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

          {/* Stats */}
          <StatsRow />

          {/* Trust pills — debajo de stats */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: "🟢", text: "100% sin TACC verificados" },
              { icon: "🛡️", text: "Sin reportes de contaminación" },
              { icon: "⭐", text: "Reseñas de la comunidad" },
              { icon: "📍", text: "Buenos Aires, Córdoba y más" },
            ].map((pill) => (
              <span
                key={pill.text}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/8 px-3 py-1.5 rounded-full"
              >
                <span>{pill.icon}</span>
                {pill.text}
              </span>
            ))}
          </div>

        </div>

        {/* Indicador de scroll — solo desktop */}
        <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground/40 animate-bounce">
          <span className="text-[10px] font-mono uppercase tracking-widest">scroll</span>
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CÓMO FUNCIONA — 3 pasos simples
      ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">

            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Tan fácil como abrir el mapa
              </h2>
              <p className="text-sm text-muted-foreground">
                Diseñado para celíacos que quieren comer tranquilos, no buscar tranquilos
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  step: "01",
                  icon: <MapPin className="h-6 w-6 text-primary" />,
                  title: "Abrí el mapa",
                  desc: "Buscá por barrio, ciudad o activá tu ubicación. Más de 800 lugares sin TACC en Argentina.",
                  href: "/mapa",
                  cta: "Ir al mapa →",
                },
                {
                  step: "02",
                  icon: <Shield className="h-6 w-6 text-primary" />,
                  title: "Verificá el nivel de seguridad",
                  desc: "Cada lugar muestra si es 100% sin gluten, si tiene opciones o si hay reportes de contaminación.",
                  href: null,
                  cta: null,
                },
                {
                  step: "03",
                  icon: <Star className="h-6 w-6 text-primary" />,
                  title: "Leé las reseñas reales",
                  desc: "La comunidad celíaca califica y cuenta su experiencia. Información actualizada por usuarios.",
                  href: null,
                  cta: null,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-white/8 bg-white/[0.025] p-6 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300"
                >
                  {/* Número de paso */}
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

      {/* ════════════════════════════════════════════════════
          LUGARES DESTACADOS
      ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section id="lugares" className="border-t border-border/40 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedSection />
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════
          TIPOS DE LUGARES — pills de categoría
      ════════════════════════════════════════════════════ */}
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

      {/* ════════════════════════════════════════════════════
          LISTAS DESTACADAS
      ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section id="listas" className="border-t border-border/40 scroll-mt-20">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <FeaturedListsSection />
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════
          CTA COMUNIDAD — sugerir lugar
      ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
            <div className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent overflow-hidden px-8 py-12 text-center">
              {/* Glow decorativo */}
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />

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

                {/* Mini trust signals */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
                    Sin registro requerido
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
                    Revisado por el equipo
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
                    Aparece en el mapa en minutos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════
          SEO: texto + ciudades + categorías (sin cambios)
      ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl text-center">
            <h2 className="text-lg font-semibold mb-3">
              El mapa para celíacos que la comunidad elige en todo el mundo
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Celimap es el mapa para celíacos sin fronteras. Encontrá restaurantes, cafés, panaderías y heladerías sin TACC donde sea que estés. Cada lugar tiene reseñas de la comunidad celíaca, nivel de seguridad (100% sin gluten u opciones) y datos de contacto. Actualizamos el mapa constantemente con sugerencias verificadas.
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

      {/* FAQ */}
      <ScrollReveal>
        <FaqSection />
      </ScrollReveal>

    </div>
  )
}
