import Link from "next/link"

export function MapaSeoIntro() {
  return (
    <section className="hidden md:block border-b border-border/40 bg-card/20 px-4 py-3">
      <div className="container mx-auto max-w-4xl text-sm text-muted-foreground leading-relaxed">
        <p>
          Mapa interactivo para celíacos en Argentina. Encontrá restaurantes, cafés y panaderías
          sin tacc en{" "}
          <Link href="/sin-gluten/la-plata" className="text-primary hover:underline">
            La Plata
          </Link>
          ,{" "}
          <Link href="/sin-gluten/san-miguel-de-tucuman" className="text-primary hover:underline">
            Tucumán
          </Link>
          , Buenos Aires y más ciudades. Verificados por la comunidad celíaca.
        </p>
      </div>
    </section>
  )
}
