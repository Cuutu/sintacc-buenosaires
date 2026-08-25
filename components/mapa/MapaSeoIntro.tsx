import Link from "next/link"

/** Contenido SEO real/rastreable debajo de la experiencia del mapa (desktop). */
export function MapaSeoIntro() {
  return (
    <section
      aria-labelledby="mapa-seo-heading"
      className="hidden md:block border-t border-border/40 bg-card/20 px-4 py-8"
    >
      <div className="container mx-auto max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 id="mapa-seo-heading" className="text-base font-semibold text-foreground">
          Mapa interactivo para celíacos en Argentina
        </h2>
        <p>
          Encontrá restaurantes, cafés y panaderías sin tacc en{" "}
          <Link href="/sin-gluten/la-plata" className="text-primary hover:underline">
            La Plata
          </Link>
          ,{" "}
          <Link
            href="/sin-gluten/san-miguel-de-tucuman"
            className="text-primary hover:underline"
          >
            Tucumán
          </Link>
          , Buenos Aires y más ciudades. Filtrá por zona y nivel de seguridad.
        </p>
        <p className="text-xs text-muted-foreground/80">
          Las reseñas y sugerencias son compartidas por la comunidad. Confirmá siempre protocolos
          y contaminación cruzada en el local antes de consumir.
        </p>
      </div>
    </section>
  )
}
