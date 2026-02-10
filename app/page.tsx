import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { MapPin, Star, Users } from "lucide-react"
import { HomeStats } from "@/components/home-stats"
import { FeaturedPlaces } from "@/components/featured-places"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Encuentra lugares sin TACC en Buenos Aires
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          La comunidad de celíacos compartiendo lugares seguros
        </p>

        <div className="max-w-2xl mx-auto mb-8">
          <SearchBar />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/mapa">Ver mapa</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href="/sugerir">Sugerir lugar</Link>
          </Button>
        </div>

        <HomeStats />
      </div>

      <FeaturedPlaces />

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <MapPin className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Mapa interactivo</CardTitle>
            <CardDescription>
              Explora lugares seguros en Buenos Aires con nuestro mapa
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Star className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Reseñas verificadas</CardTitle>
            <CardDescription>
              Lee experiencias reales de la comunidad celíaca
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Comunidad activa</CardTitle>
            <CardDescription>
              Comparte y descubre nuevos lugares seguros
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          Únete a nuestra comunidad y ayuda a otros celíacos a encontrar lugares seguros
        </p>
      </div>
    </div>
  )
}
