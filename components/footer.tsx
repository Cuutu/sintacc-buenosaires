import Link from "next/link"
import { ContactFooterButton } from "@/components/ContactFooterButton"
import { BrandLogo } from "@/components/brand/BrandLogo"

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
  {
    title: "Sobre CeliMap",
    links: [
      { href: "/que-es-celimap", label: "Qué es CeliMap" },
      { href: "/como-funciona", label: "Cómo funciona" },
      { href: "/como-verificamos-los-lugares", label: "Cómo trabajamos la información" },
      { href: "/mapa-para-celiacos", label: "Mapa para celíacos (guía)" },
      { href: "/guias", label: "Guías para celíacos" },
    ],
  },
]

function FooterColumn({ title, links }: FooterSection) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/55 mb-3">
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-cream/75 hover:text-cream transition-colors"
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
    <footer className="mt-auto bg-olive-organic overflow-hidden">
      <div className="relative container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo inverse size="sm" showTagline />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/70">
              Comunidad y mapa para encontrar lugares sin gluten con más confianza.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <FooterColumn key={section.title} {...section} />
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/55 mb-3">
              Comunidad
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/sugerir"
                  className="text-sm text-cream/75 hover:text-cream transition-colors"
                >
                  Sugerir lugar
                </Link>
              </li>
              <li>
                <Link
                  href="/sugerir-emprendimiento"
                  className="text-sm text-cream/75 hover:text-cream transition-colors"
                >
                  Sugerir emprendimiento
                </Link>
              </li>
              <li>
                <ContactFooterButton className="text-cream/75 hover:text-cream" />
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-sm text-cream/75 hover:text-cream transition-colors"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-cream/75 hover:text-cream transition-colors"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6 space-y-3">
          <p className="text-center text-xs leading-relaxed text-cream/55 max-w-2xl mx-auto">
            Las reseñas y sugerencias son compartidas por la comunidad. Confirmá siempre con el
            establecimiento antes de consumir.{" "}
            <Link href="/como-verificamos-los-lugares" className="hover:text-cream transition-colors">
              Cómo trabajamos la información
            </Link>
            .
          </p>
          <p className="text-center text-xs text-cream/45">
            © {new Date().getFullYear()} CeliMap ·{" "}
            <Link href="/privacidad" className="hover:text-cream transition-colors">
              Privacidad
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
