import type { Metadata } from "next"
import { MapLandingPage } from "@/components/seo/MapLandingPage"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const CANONICAL = `${BASE_URL}/mapa`

const FAQ = [
  {
    question: "¿Dónde encuentro un mapa sin tacc?",
    answer:
      "En CeliMap hay un mapa interactivo con restaurantes, cafés y panaderías con opciones Sin TACC en Argentina. Podés filtrar por ciudad, barrio y tipo de lugar.",
  },
  {
    question: "¿Es gratis?",
    answer:
      "Sí. Explorar CeliMap es gratuito. Solo necesitás cuenta si querés guardar favoritos o dejar reseñas.",
  },
  {
    question: "¿Qué ciudades cubre?",
    answer:
      "Hay fichas en Buenos Aires, La Plata, San Miguel de Tucumán, Córdoba, Rosario, Mendoza y otras ciudades, según lo que la comunidad fue cargando. La cobertura no es uniforme.",
  },
]

export const metadata: Metadata = {
  title: "Mapa sin tacc: lugares aptos celíacos",
  description:
    "¿Buscás un mapa sin tacc? CeliMap reúne restaurantes, cafés y panaderías con opciones Sin TACC en Argentina, con datos aportados por la comunidad.",
  keywords: [
    "mapa sin tacc",
    "lugares sin tacc",
    "restaurantes sin tacc argentina",
    "mapa celiaco",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Mapa sin tacc: lugares aptos celíacos",
    description:
      "Mapa sin tacc con restaurantes, cafés y panaderías con opciones Sin TACC en Argentina. Datos aportados por la comunidad.",
    url: CANONICAL,
    type: "website",
  },
}

export default function MapaSinTaccPage() {
  return (
    <MapLandingPage
      h1="Mapa sin tacc de Argentina"
      intro="Si buscás un mapa sin tacc, acá está: restaurantes, cafés y panaderías con datos de la comunidad, reseñas cuando existen y filtros por ciudad."
      canonicalPath="/mapa"
      metaTitle="Mapa sin tacc: lugares aptos celíacos"
      metaDescription={metadata.description as string}
      faq={FAQ}
      keywordParagraphs={[
        "Mucha gente busca «mapa sin tacc» cuando quiere encontrar opciones. CeliMap reúne esos lugares con reseñas de la comunidad cuando existen, y datos de contacto si están cargados.",
        "Hay fichas en Buenos Aires, La Plata, Tucumán y otras ciudades. Activá tu ubicación para ver opciones cerca o explorá barrio por barrio. No asumas cobertura completa.",
        "Si conocés un lugar, podés sugerirlo. Las altas se revisan antes de publicarse.",
      ]}
      crossLink={{ href: "/mapa-celiaco", label: "también buscado como mapa celíaco" }}
    />
  )
}
