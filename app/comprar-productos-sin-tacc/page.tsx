import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import { CELIMAP_NAME, CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/comprar-productos-sin-tacc"
const UPDATED_AT = "2026-08-24"

const title = "Dónde comprar productos Sin TACC"
const description =
  "CeliMap no es un supermercado. Acá se explica cómo usar el mapa para encontrar tiendas y emprendimientos Sin TACC en Argentina, además de la góndola tradicional."

const faqs = [
  {
    question: "¿CeliMap vende productos Sin TACC?",
    answer:
      "No. CeliMap no es una tienda ni una cadena de supermercados. Lista lugares y productores para que puedas ubicarlos.",
  },
  {
    question: "¿Dónde compro envasados de marca?",
    answer:
      "En supermercados y dietéticas. Cadenas como Jumbo, Coto, Carrefour o Disco pueden tener góndola sin TACC; el stock cambia por sucursal. Confirmá rótulo y lote en el envase.",
  },
  {
    question: "¿Qué muestra CeliMap para comprar?",
    answer:
      "Tiendas y emprendimientos cargados en el mapa (panificados, viandas, pastelería u otros, según la ficha). La información es colaborativa, no una certificación.",
  },
]

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    title: `${title} | ${CELIMAP_NAME}`,
    description,
    url: `${BASE_URL}${PATH}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${CELIMAP_NAME}`,
    description,
  },
}

export default function ComprarProductosSinTaccPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Comprar Sin TACC" }]}
      h1="Dónde comprar productos Sin TACC en Argentina"
      intro="Si buscás góndola de supermercado, CeliMap no reemplaza a esas cadenas. Si buscás tiendas especializadas o productores, el mapa y el directorio de emprendimientos sí pueden ayudar."
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
      primaryCta={{ href: "/tiendas-sin-gluten", label: "Ver tiendas en el mapa" }}
      secondaryCta={{ href: "/emprendimientos", label: "Ver emprendimientos" }}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">Respuesta directa</h2>
        <p className="text-muted-foreground">
          Para productos envasados de marca, el canal habitual es el supermercado o la dietética,
          leyendo el rótulo Sin TACC. Para comprar a comercios o productores listados por la
          comunidad, usá CeliMap: tiendas en el mapa y la sección de emprendimientos.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué vas a encontrar en CeliMap</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <Link href="/tiendas-sin-gluten" className="text-primary hover:underline">
              Tiendas sin gluten
            </Link>
            : comercios cargados en el mapa, cuando hay ficha aprobada.
          </li>
          <li>
            <Link href="/emprendimientos" className="text-primary hover:underline">
              Emprendimientos
            </Link>
            : proyectos que venden por encargo, delivery o redes, según los datos de cada ficha.
          </li>
          <li>
            Filtro por ciudad en{" "}
            <Link href="/sin-gluten-argentina" className="text-primary hover:underline">
              Sin gluten Argentina
            </Link>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué no promete esta página</h2>
        <p className="text-muted-foreground">
          No hay un ranking de supermercados ni un stock en tiempo real. Tampoco hay garantía de
          que un productor o tienda sea seguro para todas las personas celíacas. {CELIMAP_SAFETY_DISCLAIMER}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo usarlo</h2>
        <p className="text-muted-foreground">
          Elegí una ciudad, abrí la ficha, mirá contacto y clasificación si existen, y preguntá
          ingredientes y manipulación antes de comprar. Si conocés un comercio que falta,{" "}
          <Link href="/sugerir" className="text-primary hover:underline">
            sugerilo
          </Link>
          .
        </p>
      </section>
    </InstitutionalPage>
  )
}
