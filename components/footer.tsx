import Link from "next/link"
import { ChevronDown, Instagram } from "lucide-react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { FooterCta } from "@/components/footer-cta"
import { CELIMAP_SAME_AS } from "@/lib/seo/brand"

const INSTAGRAM_URL = CELIMAP_SAME_AS[0]

const EXPLORE_LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/sin-gluten-argentina", label: "Por ciudad" },
  { href: "/comprar-productos-sin-tacc", label: "Comprar Sin TACC" },
  { href: "/emprendimientos", label: "Emprendimientos" },
  { href: "/listas", label: "Listas" },
  { href: "/sugerir", label: "Sugerir un lugar" },
] as const

const INFO_LINKS = [
  { href: "/que-es-celimap", label: "Qué es CeliMap" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/como-verificamos-los-lugares", label: "Cómo trabajamos la información" },
  { href: "/por-que-usar-celimap", label: "Por qué usar CeliMap" },
  { href: "/guias", label: "Guías" },
] as const

const linkClass =
  "text-base text-[#C9D9CE] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"

function FooterLinkList({ links }: { links: readonly { href: string; label: string }[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className={linkClass}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function FooterAccordion({
  title,
  links,
}: {
  title: string
  links: readonly { href: string; label: string }[]
}) {
  return (
    <details className="group border-b border-[#3A6048] py-1 md:hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between py-3 text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 shrink-0 text-[#C9D9CE] transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-5">
        <FooterLinkList links={links} />
      </div>
    </details>
  )
}

function BrandBlock() {
  return (
    <div className="max-w-md">
      <Link href="/" className="inline-flex items-center">
        <BrandLogo inverse size="sm" loading="lazy" />
      </Link>
      <p className="mt-6 text-base leading-relaxed text-[#C9D9CE]">
        Descubrí restaurantes, cafeterías, panaderías y lugares sin gluten recomendados por la
        comunidad celíaca.
      </p>
      {INSTAGRAM_URL ? (
        <div className="mt-8 flex items-center gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de CeliMap"
            className="flex h-11 w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-[#C9D9CE] transition-colors hover:bg-[#3A6048] hover:text-white">
              <Instagram className="h-4 w-4" />
            </span>
          </a>
        </div>
      ) : null}
    </div>
  )
}

export function Footer() {
  return (
    <div className="mt-auto">
      <FooterCta />
      <footer className="relative overflow-hidden bg-[#234A33] pb-[var(--bottom-nav-clearance)] md:pb-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: "url(/brand/texture-wheat-watermark.svg)",
            backgroundSize: "900px 900px",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-10 md:px-5 md:py-16">
          <div className="lg:grid lg:grid-cols-[minmax(0,0.45fr)_1fr] lg:items-start lg:gap-16">
            <BrandBlock />

            <div className="mt-10 lg:mt-0">
              <FooterAccordion title="Explorar" links={EXPLORE_LINKS} />
              <FooterAccordion title="Información" links={INFO_LINKS} />

              <div className="hidden gap-16 md:grid md:grid-cols-2">
                <div>
                  <h3 className="mb-5 text-base font-semibold text-white">Explorar</h3>
                  <FooterLinkList links={EXPLORE_LINKS} />
                </div>
                <div>
                  <h3 className="mb-5 text-base font-semibold text-white">Información</h3>
                  <FooterLinkList links={INFO_LINKS} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-[#3A6048] pt-6 md:mt-16 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-relaxed text-[#C9D9CE]/80">
              © {new Date().getFullYear()} CeliMap. Confirmá siempre la información directamente con
              el local.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/contacto" className={linkClass}>
                Contacto
              </Link>
              <Link href="/privacidad" className={linkClass}>
                Privacidad
              </Link>
              <Link href="/terminos" className={linkClass}>
                Aviso legal
              </Link>
            </div>
          </div>
        </div>
        {/* Con el cartel de la app abierto, el final del footer quedaba tapado. */}
        <div aria-hidden className="h-[var(--store-banner-space,0px)] md:hidden" />
      </footer>
    </div>
  )
}
