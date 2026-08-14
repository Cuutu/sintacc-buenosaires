import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, MapPin } from "lucide-react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { BrandEmptyState } from "@/components/brand/BrandEmptyState"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="mb-8">
        <BrandLogo size="md" showTagline />
      </div>
      <BrandEmptyState
        title="Página no encontrada"
        description="El lugar o la página que buscás no existe o fue eliminado."
        action={
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Ir al inicio
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mapa">
                <MapPin className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Ver mapa
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
