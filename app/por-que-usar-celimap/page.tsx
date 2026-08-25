import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import { CELIMAP_DESCRIPTION_SHORT, CELIMAP_NAME } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/por-que-usar-celimap"
const UPDATED_AT = "2026-08-24"

const title = "Por qué usar CeliMap"
const description =
  "En qué se diferencia CeliMap de Google Maps, redes sociales, apps genéricas de restaurantes y supermercados cuando buscás lugares Sin TACC en Argentina."

const faqs = [
  {
    question: "¿CeliMap reemplaza a Google Maps?",
    answer:
      "No. Google Maps sirve para llegar y ver horarios genéricos. CeliMap organiza lugares con foco en celiaquía: clasificación, reseñas de la comunidad y páginas por ciudad.",
  },
  {
    question: "¿CeliMap reemplaza a una asociación celíaca?",
    answer:
      "No. Las asociaciones informan sobre la condición, normativa y comunidad. CeliMap es un mapa práctico de lugares, no un organismo médico.",
  },
  {
    question: "¿CeliMap es lo mismo que Find Me Gluten Free?",
    answer:
      "No. Find Me Gluten Free es una app internacional de reseñas. CeliMap está pensado para Argentina, en español, con categorías locales, Sin TACC y emprendimientos.",
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

export default function PorQueUsarCelimapPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Por qué usar CeliMap" }]}
      h1="Por qué usar CeliMap para buscar lugares Sin TACC"
      intro={`${CELIMAP_DESCRIPTION_SHORT} Esta página compara, sin atacar a nadie, cuándo conviene cada herramienta.`}
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">Respuesta directa</h2>
        <p className="text-muted-foreground">
          Usá CeliMap cuando querés un mapa colaborativo de lugares y comercios Sin TACC en
          Argentina. Usá Google o Instagram para descubrir genérico. Usá supermercados para
          góndola. Usá una asociación celíaca para información de la condición, no para el mapa
          del almuerzo.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap y Google Maps</h2>
        <p className="text-muted-foreground">
          Google Maps cubre casi cualquier negocio. No está pensado para distinguir un local 100%
          libre de gluten de uno que ofrece algunas opciones, ni para reportes de contaminación
          cruzada. CeliMap no tiene la cobertura mundial de Google: cubre lo que la comunidad y el
          equipo fueron cargando en Argentina.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap e Instagram</h2>
        <p className="text-muted-foreground">
          Instagram muestra fotos y recomendaciones sueltas. Sirve para inspiración. No es un
          directorio filtrable por ciudad, tipo de lugar y clasificación Sin TACC. En CeliMap esas
          fichas viven en un mapa y en páginas por ciudad.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap y apps genéricas de restaurantes</h2>
        <p className="text-muted-foreground">
          Las apps de delivery o de restaurantes priorizan menú y envío. Pueden tener un filtro
          “sin gluten” poco preciso. CeliMap no toma pedidos: ayuda a elegir candidatos y a leer
          contexto de la comunidad antes de ir.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap y Find Me Gluten Free</h2>
        <p className="text-muted-foreground">
          Find Me Gluten Free es una comunidad internacional de reseñas gluten-free. CeliMap no
          pretende ser su copia: el foco es Argentina, el lenguaje Sin TACC, las páginas de
          ciudad/provincia y los emprendimientos locales. Podés usar ambas; no son el mismo
          producto.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap y los supermercados</h2>
        <p className="text-muted-foreground">
          Jumbo, Coto, Carrefour o Disco venden productos envasados. CeliMap no compite con esa
          góndola. Para tiendas y productores, ver{" "}
          <Link href="/comprar-productos-sin-tacc" className="text-primary hover:underline">
            dónde comprar productos Sin TACC
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">CeliMap y las asociaciones celíacas</h2>
        <p className="text-muted-foreground">
          Asociaciones como la Asociación Celíaca Argentina o ACELA trabajan información de la
          condición, comunidad y, a veces, listados o sellos propios. CeliMap no es esa autoridad
          ni copia su contenido. Es un mapa colaborativo para ubicar lugares.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Qué aporta lo colaborativo</h2>
        <p className="text-muted-foreground">
          El mapa no es un censo nacional. Crece con sugerencias de lugares, reseñas y reportes
          cuando un dato cambia. Esa capa no existe en un mapa genérico: otra persona celíaca puede
          dejar contexto que Google o Instagram no organizan por clasificación Sin TACC.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Cómo puede participar la comunidad</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <Link href="/sugerir" className="text-primary hover:underline">
              Sugerir un lugar
            </Link>{" "}
            que falta. El equipo revisa la sugerencia antes de publicarla.
          </li>
          <li>Dejar una reseña o un reporte en una ficha ya publicada.</li>
          <li>
            Armar{" "}
            <Link href="/listas" className="text-primary hover:underline">
              listas
            </Link>{" "}
            públicas o privadas con lugares útiles.
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
