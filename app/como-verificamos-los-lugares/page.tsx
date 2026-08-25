import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import {
  CELIMAP_NAME,
  CELIMAP_SAFETY_DISCLAIMER,
  CLASSIFICATION_HELP,
  SAFETY_LABELS,
} from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/como-verificamos-los-lugares"
const UPDATED_AT = "2026-08-24"

const title = "Cómo trabajamos la información de los lugares"
const description =
  "De dónde sale la información de CeliMap, qué aporta la comunidad, qué significan las clasificaciones y qué debés confirmar antes de visitar un lugar."

const faqs = [
  {
    question: "¿CeliMap certifica locales sin TACC?",
    answer:
      "No. CeliMap no es un organismo de certificación ni realiza auditorías médicas o sanitarias independientes de cada local.",
  },
  {
    question: "¿Qué significa “100% libre de gluten” en CeliMap?",
    answer: CLASSIFICATION_HELP.dedicated_gf,
  },
  {
    question: "¿Qué hago si veo un dato incorrecto o el menú cambió?",
    answer:
      "Reportalo desde la ficha o contactá al equipo. Hasta que se corrija, la ficha puede estar desactualizada: confirmá siempre en el local.",
  },
  {
    question: "¿Con qué frecuencia revisan cada lugar?",
    answer:
      "No hay un inspector en cada cocina ni un calendario público de recertificación. El mapa se actualiza con sugerencias nuevas y con correcciones cuando llega un reporte.",
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

export default function ComoVerificamosPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Cómo trabajamos la información" }]}
      h1="Cómo trabajamos la información de los lugares en CeliMap"
      intro="Esta página explica con honestidad de dónde sale la información del mapa. No inventamos un proceso de verificación formal que hoy no exista como certificación independiente."
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">De dónde proviene la información</h2>
        <p className="text-muted-foreground">
          Los lugares publicados pasan por un estado aprobado en la base de CeliMap. Pueden
          originarse en sugerencias de la comunidad, cargas internas o enriquecimiento con datos
          públicos cuando están disponibles (por ejemplo, datos de contacto o ubicación). Lo que
          ves en la ficha es lo cargado y visible en el producto.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué puede aportar la comunidad</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Sugerir lugares nuevos.</li>
          <li>Dejar reseñas sobre la experiencia.</li>
          <li>Reportar posibles problemas de contaminación u otros avisos.</li>
          <li>Armar listas públicas o privadas con lugares útiles.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Reseñas y reportes</h2>
        <p className="text-muted-foreground">
          Las reseñas y reportes visibles reflejan experiencias individuales. No reemplazan una
          evaluación profesional del local. Si hay reportes de contaminación, tomalos como señal
          para preguntar más, no como veredicto único.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo se corrigen datos incorrectos</h2>
        <p className="text-muted-foreground">
          Cuando alguien señala un error (dirección, clasificación, cierre del local, menú que ya
          no es apto, etc.), el equipo puede revisar y actualizar la ficha. También podés{" "}
          <Link href="/sugerir" className="text-primary hover:underline">
            sugerir un lugar
          </Link>{" "}
          o aportar contexto en reseñas. La corrección depende de poder validar el cambio con la
          información disponible. Hasta entonces, tratá la ficha como una pista, no como un sello.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué significa cada clasificación</h2>
        <dl className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-medium">{SAFETY_LABELS.dedicated_gf}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              {CLASSIFICATION_HELP.dedicated_gf}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-medium">{SAFETY_LABELS.gf_options}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              {CLASSIFICATION_HELP.gf_options}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-medium">{SAFETY_LABELS.community}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">{CLASSIFICATION_HELP.community}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué confirmar antes de visitar</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Si preparan sin gluten en cocina o estación separada.</li>
          <li>Cómo evitan contaminación cruzada (aceites, parrillas, freidoras, utensilios).</li>
          <li>Si el personal entiende celiaquía y pedidos sin TACC.</li>
          <li>Horarios, stock y cambios recientes del menú.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Más recursos</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="/guias" className="text-primary hover:underline">
              Guías editoriales
            </Link>
          </li>
          <li>
            <Link href="/como-funciona" className="text-primary hover:underline">
              Cómo funciona CeliMap
            </Link>
          </li>
          <li>
            <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
              Por qué usar CeliMap
            </Link>
          </li>
          <li>
            <Link href="/mapa" className="text-primary hover:underline">
              Ir al mapa
            </Link>
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
