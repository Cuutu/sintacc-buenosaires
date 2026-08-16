import type { Metadata } from "next"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import { CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/terminos"
const UPDATED_AT = "2026-08-14"

const title = "Términos de uso"
const description =
  "Cómo usar CeliMap: información colaborativa, sin garantía médica, y la responsabilidad de confirmar siempre en el local."

const faqs = [
  {
    question: "¿CeliMap garantiza que un lugar sea seguro?",
    answer:
      "No. CeliMap es una guía colaborativa. Antes de comer o comprar, confirmá protocolos y riesgo de contaminación cruzada con el local.",
  },
  {
    question: "¿Quién carga la información?",
    answer:
      "La comunidad y el equipo de CeliMap. Los datos pueden estar incompletos o desactualizados. La ficha es una ayuda, no una certificación.",
  },
]

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    title: `${title} | CeliMap`,
    description,
    url: `${BASE_URL}${PATH}`,
    type: "website",
  },
}

export default function TerminosPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: title, href: PATH },
      ]}
      h1={title}
      intro="CeliMap es un mapa y guía colaborativa. Al usarlo, aceptás estas condiciones simples."
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
    >
      <section>
        <h2>Uso del sitio y la app</h2>
        <p>
          CeliMap sirve para descubrir restaurantes, cafeterías, panaderías y otros lugares con
          opciones sin TACC, según datos de la comunidad y del equipo. No es un servicio médico ni
          una certificación.
        </p>
      </section>
      <section>
        <h2>Información de los lugares</h2>
        <p>{CELIMAP_SAFETY_DISCLAIMER}</p>
      </section>
      <section>
        <h2>Tu cuenta</h2>
        <p>
          Si creás una cuenta, sos responsable de lo que publicás (reseñas, reportes, sugerencias).
          Podés pedir la eliminación de la cuenta desde Perfil.
        </p>
      </section>
      <section>
        <h2>Contacto</h2>
        <p>
          Consultas:{" "}
          <a href="mailto:hola@celimap.com.ar" className="text-primary hover:underline">
            hola@celimap.com.ar
          </a>
          .
        </p>
      </section>
    </InstitutionalPage>
  )
}
