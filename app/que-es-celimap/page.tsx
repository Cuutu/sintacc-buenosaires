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
const UPDATED_AT = "2026-08-24"

const title = "Qué es CeliMap"
const description = CELIMAP_DESCRIPTION

const faqs = [
  {
    question: "¿Qué es CeliMap?",
    answer:
      "CeliMap es un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas en Argentina. No es una asociación médica ni un tratamiento.",
  },
  {
    question: "¿CeliMap garantiza que un lugar sea seguro?",
    answer:
      "No. La información puede venir de la comunidad y de datos cargados en el mapa. Cada persona debe confirmar protocolos y riesgo de contaminación cruzada en el local.",
  },
  {
    question: "¿Cómo aporto un lugar que falta?",
    answer:
      "Podés recomendar un lugar desde la página Sugerir. El equipo revisa la sugerencia antes de publicarla en el mapa.",
  },
  {
    question: "¿CeliMap sirve solo para Buenos Aires?",
    answer:
      "No. Hay fichas y páginas por varias ciudades y provincias, con cobertura desigual. Si falta un lugar en una ciudad chica, se puede sugerir.",
  },
  {
    question: "¿CeliMap reemplaza a Google Maps o a un supermercado?",
    answer:
      "No. Google Maps es un mapa genérico. Los supermercados venden productos envasados. CeliMap organiza lugares para comer o comprar con foco en celiaquía y Sin TACC.",
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
        <h2 className="mb-3 text-xl font-semibold">Para quién está pensado</h2>
        <p className="text-muted-foreground">
          Para personas celíacas, quienes evitan el gluten, familiares y viajeros que necesitan
          ubicar opciones en Argentina. No reemplaza el criterio médico ni el de cada persona en
          el local.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué significa Sin TACC en CeliMap</h2>
        <p className="text-muted-foreground">
          En Argentina, Sin TACC se usa para productos y preparaciones sin trigo, avena, cebada ni
          centeno. En CeliMap esa etiqueta describe lo que está cargado en la ficha (lugar
          dedicado u opciones), no una certificación emitida por CeliMap.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué no es CeliMap</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>No es una enfermedad, diagnóstico ni tratamiento médico.</li>
          <li>No es una asociación médica ni un organismo de certificación.</li>
          <li>No es un restaurante, un delivery propio ni una cadena de supermercados.</li>
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
            <Link href="/sin-gluten-argentina" className="text-primary hover:underline">
              Directorio por ciudad
            </Link>
          </li>
          <li>
            <Link href="/comprar-productos-sin-tacc" className="text-primary hover:underline">
              Dónde comprar productos Sin TACC
            </Link>
          </li>
          <li>
            <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
              Por qué usar CeliMap frente a otras búsquedas
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
