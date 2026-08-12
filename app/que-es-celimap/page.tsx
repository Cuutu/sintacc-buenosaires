import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import {
  CELIMAP_DESCRIPTION,
  CELIMAP_NAME,
  CELIMAP_SAFETY_DISCLAIMER,
} from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/que-es-celimap"
const UPDATED_AT = "2026-08-12"

const title = "Qué es CeliMap"
const description = CELIMAP_DESCRIPTION

const faqs = [
  {
    question: "¿Qué es CeliMap?",
    answer:
      "CeliMap es un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas. No es una asociación médica ni un tratamiento.",
  },
  {
    question: "¿CeliMap garantiza que un lugar sea seguro?",
    answer:
      "No. La información puede venir de la comunidad y de datos cargados en el mapa. Cada persona debe confirmar protocolos y riesgo de contaminación cruzada en el local.",
  },
  {
    question: "¿Cómo aporto un lugar que falta?",
    answer:
      "Podés recomendar un lugar desde la página Sugerir. Después, otras personas pueden encontrar esa ficha en el mapa y en las páginas por ciudad.",
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

export default function QueEsCelimapPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Qué es CeliMap" }]}
      h1="Qué es CeliMap: mapa y guía colaborativa sin TACC"
      intro={CELIMAP_DESCRIPTION}
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({
        name: title,
        description,
        path: PATH,
        faqs,
      })}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">Para qué sirve</h2>
        <p className="text-muted-foreground">
          Sirve para descubrir restaurantes, cafeterías, panaderías, heladerías, tiendas y
          emprendimientos con opciones sin TACC; guardar lugares; crear listas; y compartir
          experiencias con otras personas celíacas o que evitan el gluten.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué no es CeliMap</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>No es una enfermedad, diagnóstico ni tratamiento médico.</li>
          <li>No es una asociación médica ni un organismo de certificación.</li>
          <li>No es un restaurante ni un delivery propio.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo se clasifican los lugares</h2>
        <p className="mb-3 text-muted-foreground">
          En las fichas podés ver, cuando hay datos, si un lugar figura como{" "}
          <strong className="text-foreground">100% libre de gluten</strong> o como lugar que{" "}
          <strong className="text-foreground">ofrece opciones sin TACC</strong>. Esa clasificación
          refleja la información cargada en CeliMap, no una auditoría independiente.
        </p>
        <p className="text-sm text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Dónde empezar</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="/mapa" className="text-primary hover:underline">
              Abrí el mapa interactivo
            </Link>
          </li>
          <li>
            <Link href="/sin-gluten/la-plata" className="text-primary hover:underline">
              Lugares sin TACC en La Plata
            </Link>
          </li>
          <li>
            <Link href="/sin-gluten/san-miguel-de-tucuman" className="text-primary hover:underline">
              Lugares sin TACC en San Miguel de Tucumán
            </Link>
          </li>
          <li>
            <Link href="/como-funciona" className="text-primary hover:underline">
              Cómo funciona CeliMap
            </Link>
          </li>
          <li>
            <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
              Cómo trabajamos la información de los lugares
            </Link>
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
