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
      {/* Hero - compacto mobile-first */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-1/2 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/2 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        <div className="container mx-auto px-4 py-10 md:py-20 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-base font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Argentina · Comunidad celíaca
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Encontrá lugares
              <br />
              <span className="text-primary">libres de gluten</span>
              <br />
              cerca tuyo
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6">
              Lugares verificados por la comunidad. Reseñas reales. Mapas interactivos.
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
