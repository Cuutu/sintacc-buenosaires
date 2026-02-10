import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { MapPin, Star, Users, ArrowRight, Sparkles, ChevronDown } from "lucide-react"
import { HomeStats } from "@/components/home-stats"
import { FeaturedPlaces } from "@/components/featured-places"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Gradient background */}
      <div className="relative overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-1/2 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/2 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Argentina · Comunidad celíaca
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Encontrá lugares
              <br />
              <span className="text-primary">libres de gluten</span>
              <br />
              cerca tuyo
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10">
              Lugares verificados por la comunidad. Reseñas reales. Mapas interactivos.
            </p>

            <div className="max-w-2xl mx-auto mb-10">
              <SearchBar />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="text-base px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/mapa" className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ver mapa
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base px-8 h-12 border-border hover:bg-accent">
                <Link href="/sugerir" className="flex items-center gap-2">
                  Sugerir lugar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <HomeStats />

            <a
              href="#lugares"
              className="inline-flex flex-col items-center gap-1 mt-8 text-muted-foreground hover:text-primary transition-colors animate-bounce"
              aria-label="Ver lugares destacados"
            >
              <span className="text-sm font-medium">Ver lugares</span>
              <ChevronDown className="h-8 w-8" />
            </a>
          </div>
        </div>
      </div>

      {/* Featured Places */}
      <div id="lugares" className="container mx-auto px-4 py-16 border-t border-border/50 scroll-mt-20">
        <FeaturedPlaces />
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors group">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <MapPin className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Mapa interactivo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Explorá lugares seguros en Buenos Aires con filtros por barrio, tipo y más.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors group">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Star className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Reseñas verificadas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Experiencias reales de la comunidad celíaca. Cocina separada, sensación segura.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors group">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Comunidad activa</CardTitle>
              <CardDescription className="text-muted-foreground">
                Compartí y descubrí nuevos lugares. Cada sugerencia suma.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-border/50">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-6">
            Unite a la comunidad y ayudá a otros celíacos a encontrar lugares seguros
          </p>
          <Button asChild variant="outline" size="lg" className="border-primary/30 text-primary hover:bg-primary/10">
            <Link href="/sugerir">Sugerir un lugar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
