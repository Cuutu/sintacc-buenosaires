import Link from "next/link"

/** Intro SEO: H1 siempre en el DOM (sr-only en mobile). Copy extra solo desktop. */
export function MapaSeoIntro() {
  const linkClass = "text-primary hover:underline"

  return (
    <section aria-labelledby="mapa-seo-heading">
      <h1
        id="mapa-seo-heading"
        className="sr-only md:not-sr-only md:container md:mx-auto md:mt-8 md:mb-3 md:max-w-3xl md:px-4 md:text-base md:font-semibold md:text-foreground"
      >
        Mapa de lugares sin TACC cerca tuyo
      </h1>
      <div className="hidden md:block border-t border-border/40 bg-card/20 px-4 pb-8">
        <div className="container mx-auto max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Encontrá restaurantes, panaderías y cafés con opciones sin TACC cerca tuyo. CeliMap es un
            mapa colaborativo: usá filtros por tipo y zona, o entrá a las guías de{" "}
            <Link href="/sin-gluten/buenos-aires" className={linkClass}>
              Buenos Aires
            </Link>
            {", "}
            <Link href="/sin-gluten/la-plata" className={linkClass}>
              La Plata
            </Link>
            {" y "}
            <Link href="/sin-gluten/cordoba" className={linkClass}>
              Córdoba
            </Link>
            .
          </p>
          <p>
            También podés ver el{" "}
            <Link href="/sin-gluten-argentina" className={linkClass}>
              listado de lugares sin TACC en Argentina
            </Link>
            {" y los "}
            <Link href="/restaurantes-sin-gluten" className={linkClass}>
              restaurantes sin TACC
            </Link>
            . Confirmá siempre protocolos y contaminación cruzada en el local.
          </p>
        </div>
      </div>
    </section>
  )
}
