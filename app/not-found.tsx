import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Home, MapPin } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <Image
        src="/celimaplogocompleto.png"
        alt="Celimap"
        width={140}
        height={36}
        className="h-9 w-auto mb-8"
      />
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold mt-4">Página no encontrada</h2>
      <p className="text-muted-foreground mt-2 text-center max-w-md">
        El lugar o la página que buscás no existe o fue eliminado.
      </p>
      <div className="flex gap-4 mt-8">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/mapa">
            <MapPin className="mr-2 h-4 w-4" />
            Ver mapa
          </Link>
        </Button>
      </div>
    </div>
  )
}
