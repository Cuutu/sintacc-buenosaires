import Link from "next/link"
import Image from "next/image"
import { ContactFooterButton } from "@/components/ContactFooterButton"

type FooterLink = { href: string; label: string }

type FooterSection = {
  title: string
  links: FooterLink[]
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Explorar",
    links: [
      { href: "/mapa", label: "Mapa para celíacos" },
      { href: "/mapa-sin-tacc", label: "Mapa sin tacc" },
      { href: "/mapa-celiaco", label: "Mapa celíaco" },
      { href: "/listas", label: "Listas" },
      { href: "/emprendimientos", label: "Emprendimientos" },
      { href: "/sin-gluten-argentina", label: "Lugares sin gluten Argentina" },
    ],
  },
  {
    title: "Por ciudad",
    links: [
      { href: "/sin-gluten/buenos-aires", label: "Sin gluten Buenos Aires" },
      { href: "/restaurantes-sin-gluten", label: "Restaurantes sin gluten" },
    ],
  },
]

function FooterColumn({ title, links }: FooterSection) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/celimaplogocompleto.png"
                alt="Celimap"
                width={130}
                height={34}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Mapa colaborativo para celíacos en Argentina.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <FooterColumn key={section.title} {...section} />
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
              Comunidad
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/sugerir"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sugerir lugar
                </Link>
              </li>
              <li>
                <Link
                  href="/sugerir-emprendimiento"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sugerir emprendimiento
                </Link>
              </li>
              <li>
                <ContactFooterButton />
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-6 space-y-3">
          <p className="text-center text-xs leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Las reseñas y sugerencias son compartidas por la comunidad. Siempre verificá con el
            establecimiento antes de consumir.
          </p>
          <p className="text-center text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} Celimap ·{" "}
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Privacidad
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
