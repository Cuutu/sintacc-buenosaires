import Link from "next/link"

/** Intro SEO: H1 siempre en el DOM (sr-only en mobile). Copy extra solo desktop. */
export function MapaSeoIntro() {
  const linkClass =
    "font-bold text-[#B84420] underline decoration-[#B84420]/35 underline-offset-[3px] hover:decoration-[#B84420]"

  return (
    <section aria-labelledby="mapa-seo-heading" className="md:border-t md:border-[#E2DACB]">
      <div className="md:container md:mx-auto md:grid md:max-w-5xl md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 md:px-5 md:py-14">
        <div>
          <p className="hidden md:block font-serif text-lg font-medium italic text-[#B84420]">
            sobre este mapa
          </p>
          <h1
            id="mapa-seo-heading"
            className="sr-only md:not-sr-only md:mt-1 md:text-[34px] md:font-extrabold md:leading-[1.06] md:tracking-[-0.03em] md:text-olive md:[text-wrap:balance]"
          >
            Mapa de lugares sin TACC cerca tuyo
          </h1>
        </div>
        <div className="hidden md:block space-y-4 text-base leading-relaxed text-[#5E6A60] md:pt-8">
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
