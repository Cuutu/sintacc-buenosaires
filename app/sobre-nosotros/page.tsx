import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import {
  CELIMAP_NAME,
  CELIMAP_DESCRIPTION,
  CELIMAP_SAFETY_DISCLAIMER,
} from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/sobre-nosotros"
const UPDATED_AT = "2026-09-10"

const title = "Sobre nosotros"
const description = `Conocé ${CELIMAP_NAME}: un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas en Argentina.`

const faqs = [
  {
    question: "¿Quién está detrás de CeliMap?",
    answer:
      "CeliMap es un proyecto digital enfocado en ayudar a personas celíacas y quienes evitan el gluten a encontrar lugares seguros. No es una asociación médica ni un organismo de certificación.",
  },
  {
    question: "¿CeliMap es 100% confiable?",
    answer:
      "No. La información puede venir de la comunidad y de datos cargados en el mapa. Cada persona debe confirmar protocolos y riesgo de contaminación cruzada en el local antes de comer o comprar.",
  },
  {
    question: "¿Cómo se financia CeliMap?",
    answer:
      "CeliMap es un proyecto independiente sin publicidad intrusiva. No vendemos datos personales ni certificamos lugares a cambio de pago.",
  },
  {
    question: "¿Puedo colaborar con CeliMap?",
    answer:
      "Sí. Podés sugerir lugares nuevos, dejar reseñas honestas, crear listas y compartir tu experiencia con la comunidad.",
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

export default function SobreNosotrosPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Sobre nosotros" }]}
      h1="Sobre nosotros"
      intro={description}
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
        <h2 className="mb-3 text-xl font-semibold">Qué es CeliMap</h2>
        <p className="text-muted-foreground">
          {CELIMAP_DESCRIPTION}
        </p>
        <p className="mt-3 text-muted-foreground">
          Está pensado para personas celíacas, familiares, viajeros y quienes evitan el gluten en
          Argentina.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Nuestra misión</h2>
        <p className="text-muted-foreground">
          Queremos facilitar el acceso a información sobre lugares sin TACC o con opciones aptas,
          centralizar experiencias de la comunidad y ayudar a que más personas encuentren opciones
          seguras cerca de donde están.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué no somos</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>No somos una asociación médica, organismo de certificación ni entidad reguladora.</li>
          <li>No somos un restaurante, delivery propio, supermercado ni red de comercios.</li>
          <li>No garantizamos que un lugar sea seguro ni emitimos certificados de productos.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo funciona</h2>
        <p className="mb-3 text-muted-foreground">
          CeliMap organiza lugares en un mapa interactivo, con fichas que indican si un sitio es
          100% libre de gluten o si ofrece opciones sin TACC. La información puede venir de la
          comunidad, datos públicos y verificaciones básicas del equipo.
        </p>
        <p className="text-muted-foreground">
          Conocé más sobre el proceso en{" "}
          <Link href="/como-funciona" className="text-primary hover:underline">
            Cómo funciona
          </Link>{" "}
          y{" "}
          <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
            Cómo verificamos los lugares
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Más información</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="/que-es-celimap" className="text-primary hover:underline">
              Qué es CeliMap
            </Link>
          </li>
          <li>
            <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
              Por qué usar CeliMap
            </Link>
          </li>
          <li>
            <Link href="/contacto" className="text-primary hover:underline">
              Contacto
            </Link>
          </li>
          <li>
            <Link href="/sugerir" className="text-primary hover:underline">
              Sugerir un lugar
            </Link>
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
