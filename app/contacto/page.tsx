import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import {
  CELIMAP_NAME,
  CELIMAP_DESCRIPTION,
} from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/contacto"
const UPDATED_AT = "2026-09-10"
const CONTACT_MAIL = "hola@celimap.com.ar"

const title = "Contacto"
const description = `Contactá con ${CELIMAP_NAME} para consultas generales. Para sugerencias de lugares usá el formulario de Sugerir.`

const faqs = [
  {
    question: "¿Cómo puedo contactar con CeliMap?",
    answer: `Podés escribirnos a ${CONTACT_MAIL} para consultas generales. Te responderemos lo antes posible.`,
  },
  {
    question: "¿Cómo sugiero un lugar que falta?",
    answer:
      "Para recomendar un lugar nuevo, usá la página Sugerir un lugar. Ahí podés completar los datos y el equipo revisará la sugerencia antes de publicarla en el mapa.",
  },
  {
    question: "¿CeliMap tiene oficina física o atención telefónica?",
    answer:
      "No. CeliMap es un proyecto digital. El contacto es por email únicamente.",
  },
  {
    question: "¿CeliMap certifica lugares o emite documentación médica?",
    answer:
      "No. CeliMap es un mapa colaborativo, no es una asociación médica ni un organismo de certificación. No emitimos certificados de productos ni auditorías de lugares.",
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

export default function ContactoPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Contacto" }]}
      h1="Contacto"
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
        <h2 className="mb-3 text-xl font-semibold">Email de contacto</h2>
        <p className="text-muted-foreground">
          Para consultas generales, escribinos a{" "}
          <a
            href={`mailto:${CONTACT_MAIL}`}
            className="text-primary hover:underline font-medium"
          >
            {CONTACT_MAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Sugerir un lugar</h2>
        <p className="text-muted-foreground">
          Si conocés un restaurante, panadería, cafetería u otro lugar sin TACC que falta en el
          mapa, usá el{" "}
          <Link href="/sugerir" className="text-primary hover:underline font-medium">
            formulario de sugerencias
          </Link>
          . El equipo revisa cada aporte antes de publicarlo.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué no hacemos</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>No certificamos lugares ni productos.</li>
          <li>No emitimos documentación médica ni diagnósticos.</li>
          <li>No tenemos oficina física, atención telefónica ni CUIT público.</li>
          <li>No garantizamos que un lugar sea seguro para todas las personas celíacas.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Sobre CeliMap</h2>
        <p className="text-muted-foreground">
          {CELIMAP_DESCRIPTION}
        </p>
        <p className="mt-3 text-muted-foreground">
          Conocé más en{" "}
          <Link href="/que-es-celimap" className="text-primary hover:underline">
            Qué es CeliMap
          </Link>
          .
        </p>
      </section>
    </InstitutionalPage>
  )
}
