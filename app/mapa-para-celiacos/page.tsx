import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import { CELIMAP_DESCRIPTION_SHORT, CELIMAP_NAME, CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/mapa-para-celiacos"
const UPDATED_AT = "2026-08-12"

const title = "Mapa para celíacos"
const description =
  "Mapa para celíacos en Argentina: encontrá restaurantes, cafeterías y comercios sin TACC o con opciones aptas. Guía colaborativa de CeliMap."

const faqs = [
  {
    question: "¿Hay un mapa para celíacos en Argentina?",
    answer:
      "Sí. CeliMap ofrece un mapa colaborativo y páginas por ciudad para encontrar lugares sin TACC o con opciones aptas para personas celíacas.",
  },
  {
    question: "¿Sirve solo para Buenos Aires?",
    answer:
      "No. Hay fichas y landings por varias ciudades (por ejemplo La Plata, Córdoba, Rosario, Mendoza, San Miguel de Tucumán y más), además del mapa nacional.",
  },
  {
    question: "¿El mapa reemplaza preguntar en el local?",
    answer:
      "No. Usalo como punto de partida y confirmá siempre manipulación y contaminación cruzada antes de comer.",
  },
]

const PRIORITY_CITIES = [
  { slug: "buenos-aires", name: "Buenos Aires" },
  { slug: "la-plata", name: "La Plata" },
  { slug: "cordoba", name: "Córdoba" },
  { slug: "rosario", name: "Rosario" },
  { slug: "mendoza", name: "Mendoza" },
  { slug: "mar-del-plata", name: "Mar del Plata" },
  { slug: "san-miguel-de-tucuman", name: "San Miguel de Tucumán" },
  { slug: "salta", name: "Salta" },
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

export default function MapaParaCeliacosPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Mapa para celíacos" }]}
      h1="Mapa para celíacos: encontrá lugares sin TACC"
      intro={`${CELIMAP_DESCRIPTION_SHORT} Esta página resume cómo usar el mapa y las guías por ciudad.`}
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
      primaryCta={{ href: "/mapa", label: "Abrir el mapa" }}
      secondaryCta={{ href: "/sugerir", label: "Recomendar un lugar" }}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué vas a encontrar</h2>
        <p className="text-muted-foreground">
          Un mapa interactivo y listados por ciudad con restaurantes, cafeterías, panaderías,
          heladerías, tiendas y otros comercios. Cuando hay datos, se diferencia un lugar 100%
          libre de gluten de uno que ofrece opciones sin TACC.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Ciudades para empezar</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PRIORITY_CITIES.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/sin-gluten/${city.slug}`}
                className="text-primary hover:underline"
              >
                Sin TACC en {city.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Ver todas en{" "}
          <Link href="/sin-gluten-argentina" className="text-primary hover:underline">
            Sin gluten Argentina
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo usarlo con responsabilidad</h2>
        <p className="text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>
        <p className="mt-3 text-muted-foreground">
          Para entender las clasificaciones, leé{" "}
          <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
            cómo trabajamos la información
          </Link>
          . Para el recorrido de producto,{" "}
          <Link href="/como-funciona" className="text-primary hover:underline">
            cómo funciona CeliMap
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Otras entradas al mapa</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="/mapa-sin-tacc" className="text-primary hover:underline">
              Mapa sin TACC
            </Link>
          </li>
          <li>
            <Link href="/mapa-celiaco" className="text-primary hover:underline">
              Mapa celíaco
            </Link>
          </li>
          <li>
            <Link href="/guias" className="text-primary hover:underline">
              Guías
            </Link>
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
