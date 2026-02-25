import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapPin, ArrowRight, Sparkles } from "lucide-react"
import { StatsRow } from "@/components/home/StatsRow"
import { FeaturedSection } from "@/components/featured/FeaturedSection"
import { ScrollReveal } from "@/components/scroll-reveal"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero - compacto mobile, full viewport en desktop para que "Lugares destacados" quede abajo */}
      <div className="relative overflow-hidden md:min-h-[calc(100vh-4rem)] md:flex md:items-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-1/2 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/2 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        <div className="container mx-auto px-4 py-10 md:py-12 max-w-3xl mx-auto w-full">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-base font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Celimap · Mapa para celíacos
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Mapa para celíacos:
              <br />
              encontrá lugares
              <br />
              <span className="text-primary">libres de gluten</span>
              <br />
              cerca tuyo
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6">
              El mapa para celiacos en Buenos Aires. Lugares verificados por la comunidad, reseñas reales y opciones sin TACC.
            </p>

            <div className="mb-6">
              <SearchBar />
            </div>

            {/* CTA principal grande: Abrir mapa */}
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto min-h-[48px] text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link href="/mapa" className="flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" />
                Abrir mapa
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="mt-4 w-full sm:w-auto min-h-[48px] text-base px-8 py-6 border-border hover:bg-accent sm:ml-4"
            >
              <Link href="/sugerir" className="flex items-center justify-center gap-2">
                Sugerir lugar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {/* Stats: scroll horizontal mobile, grid desktop */}
            <div className="mt-10">
              <StatsRow />
            </div>
          </div>
        </div>
      </div>

      {/* Lugares destacados */}
      <ScrollReveal>
        <div id="lugares" className="container mx-auto px-4 py-12 md:py-16 border-t border-border/50 scroll-mt-20">
          <FeaturedSection />
        </div>
      </ScrollReveal>

      {/* Sección SEO: contenido para "mapa para celiacos" */}
      <ScrollReveal>
        <section className="container mx-auto px-4 py-12 md:py-16 border-t border-border/50 scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-xl font-semibold">
              El mapa para celíacos que la comunidad de Buenos Aires elige
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Celimap es el mapa para celiacos más completo de CABA y alrededores. Encontrá restaurantes, cafés, panaderías y heladerías sin TACC. Cada lugar tiene reseñas de la comunidad celíaca, nivel de seguridad (100% sin gluten u opciones) y datos de contacto. Actualizamos el mapa constantemente con sugerencias verificadas.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ - coincide con FAQ schema para rich snippets */}
      <ScrollReveal>
        <section className="container mx-auto px-4 py-12 md:py-16 border-t border-border/50 scroll-mt-20" aria-label="Preguntas frecuentes">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-center mb-8">Preguntas frecuentes sobre el mapa para celíacos</h2>
            <dl className="space-y-6">
              <div>
                <dt className="font-medium text-foreground">¿Qué es el mapa para celíacos?</dt>
                <dd className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  El mapa para celíacos de Celimap es una plataforma donde la comunidad comparte restaurantes, cafés y panaderías sin TACC en Buenos Aires. Podés ver el mapa interactivo, filtrar por barrio y nivel de seguridad, y leer reseñas de otros celíacos.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">¿Dónde comer sin gluten en Buenos Aires?</dt>
                <dd className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  En Celimap encontrás el mapa de lugares sin gluten en Buenos Aires. Incluye restaurantes 100% sin TACC, cafés con opciones aptas y panaderías certificadas. Cada lugar tiene reseñas de la comunidad celíaca.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">¿Cómo saber si un lugar es seguro para celíacos?</dt>
                <dd className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  En Celimap cada lugar tiene un nivel de seguridad: 100% sin gluten (dedicado) u opciones sin gluten. Las reseñas de la comunidad te ayudan a decidir. También podés reportar si tuviste una experiencia de contaminación.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA */}
      <ScrollReveal>
        <div className="border-t border-border/50">
          <div className="container mx-auto px-4 py-12 md:py-16 text-center">
            <p className="text-base text-muted-foreground mb-6">
              Unite a la comunidad y ayudá a otros celíacos a encontrar lugares seguros
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-[48px] border-primary/30 text-primary hover:bg-primary/10"
            >
              <Link href="/sugerir">Sugerir un lugar</Link>
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  )
}
