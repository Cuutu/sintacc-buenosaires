import Link from "next/link"
import Image from "next/image"
import { ContactFooterButton } from "@/components/ContactFooterButton"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/celimaplogocompleto.png"
              alt="Celimap"
              width={130}
              height={34}
              className="h-7 w-auto"
            />
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/mapa" className="hover:text-foreground transition-colors">
              Mapa
            </Link>
            <Link href="/listas" className="hover:text-foreground transition-colors">
              Listas
            </Link>
            <Link href="/sugerir" className="hover:text-foreground transition-colors">
              Sugerir lugar
            </Link>
            <ContactFooterButton />
            <Link href="/login" className="hover:text-foreground transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
          Las reseñas y sugerencias son compartidas por la comunidad. Siempre verificá con el establecimiento antes de consumir.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          © {new Date().getFullYear()} Celimap
        </p>
      </div>
    </footer>
  )
}
