import type { Metadata } from "next"
import Link from "next/link"
import {
  InstitutionalPage,
  buildWebPageJsonLd,
} from "@/components/seo/InstitutionalPage"
import { CELIMAP_DESCRIPTION_SHORT, CELIMAP_NAME } from "@/lib/seo/brand"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/como-funciona"
const UPDATED_AT = "2026-08-24"

const title = "Cómo funciona CeliMap"
const description =
  "Cómo usar CeliMap: explorar el mapa, filtrar lugares sin TACC, ver fichas, guardar favoritos, crear listas y recomendar lugares faltantes."

const faqs = [
  {
    question: "¿Necesito cuenta para usar el mapa?",
    answer:
      "Podés explorar el mapa y las páginas de ciudades sin cuenta. Para guardar favoritos, crear listas o aportar reseñas, sí necesitás iniciar sesión.",
  },
  {
    question: "¿Cómo busco por ciudad o tipo de lugar?",
    answer:
      "Entrá a Sin gluten Argentina, usá URLs como /sin-gluten/la-plata o /restaurantes-sin-gluten, o abrí el mapa y filtrá por tipo y zona.",
  },
  {
    question: "¿Con qué frecuencia se actualiza el mapa?",
    answer:
      "No hay un calendario público. Los lugares nuevos se publican cuando una sugerencia se revisa. Las fichas se corrigen cuando alguien reporta un cambio.",
  },
  {
    question: "¿Puedo compartir una lista privada?",
    answer:
      "Sí. Las listas privadas se comparten con un enlace privado y no se indexan en buscadores. Las listas públicas sí pueden aparecer en el directorio de listas.",
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

export default function ComoFuncionaPage() {
  return (
    <InstitutionalPage
      breadcrumbs={[{ label: "Cómo funciona" }]}
      h1="Cómo funciona CeliMap"
      intro={`${CELIMAP_DESCRIPTION_SHORT} Acá te contamos el recorrido básico para usarlo.`}
      updatedAt={UPDATED_AT}
      faqs={faqs}
      jsonLd={buildWebPageJsonLd({ name: title, description, path: PATH, faqs })}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">1. Explorá el mapa</h2>
        <p className="text-muted-foreground">
          El{" "}
          <Link href="/mapa" className="text-primary hover:underline">
            mapa interactivo
          </Link>{" "}
          muestra lugares aprobados. Podés acercarte a tu zona, abrir fichas y moverte entre
          barrios o ciudades.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">2. Filtrá por zona y tipo</h2>
        <p className="text-muted-foreground">
          En el mapa podés acercarte a tu zona y filtrar por tipo (restaurantes, cafés, panaderías,
          tiendas, heladerías, bares). También hay listados por ciudad, por provincia y por
          categoría nacional, por ejemplo{" "}
          <Link href="/restaurantes-sin-gluten" className="text-primary hover:underline">
            restaurantes sin gluten
          </Link>{" "}
          o{" "}
          <Link href="/tiendas-sin-gluten" className="text-primary hover:underline">
            tiendas sin gluten
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">3. Mirá fichas y señales</h2>
        <p className="text-muted-foreground">
          Cada ficha puede incluir dirección, tipo de local, clasificación (100% libre de gluten u
          opciones sin TACC), reseñas y reportes cuando existen. Usá esa información como guía, no
          como garantía absoluta.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">4. Guardá y organizá</h2>
        <p className="text-muted-foreground">
          Con cuenta podés marcar favoritos y armar{" "}
          <Link href="/listas" className="text-primary hover:underline">
            listas
          </Link>
          : públicas para compartir con la comunidad, o privadas con enlace restringido.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">5. Aportá a la comunidad</h2>
        <p className="text-muted-foreground">
          Si falta un lugar,{" "}
          <Link href="/sugerir" className="text-primary hover:underline">
            recomendalo
          </Link>
          . También podés dejar reseñas o reportes en fichas existentes para ayudar a otras
          personas.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Páginas útiles</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="/que-es-celimap" className="text-primary hover:underline">
              Qué es CeliMap
            </Link>
          </li>
          <li>
            <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
              Cómo trabajamos la información
            </Link>
          </li>
          <li>
            <Link href="/mapa-para-celiacos" className="text-primary hover:underline">
              Mapa para celíacos
            </Link>
          </li>
          <li>
            <Link href="/por-que-usar-celimap" className="text-primary hover:underline">
              Por qué usar CeliMap
            </Link>
          </li>
          <li>
            <Link href="/comprar-productos-sin-tacc" className="text-primary hover:underline">
              Comprar productos Sin TACC
            </Link>
          </li>
          <li>
            <Link href="/sin-gluten-argentina" className="text-primary hover:underline">
              Directorio por ciudad
            </Link>
          </li>
        </ul>
      </section>
    </InstitutionalPage>
  )
}
