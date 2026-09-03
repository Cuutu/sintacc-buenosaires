import type { Metadata } from "next"
import { MapLandingPage } from "@/components/seo/MapLandingPage"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const CANONICAL = `${BASE_URL}/mapa`

const FAQ = [
  {
    question: "¿Hay un mapa para celíacos en Argentina?",
    answer:
      "Sí. CeliMap es un mapa colaborativo con restaurantes, panaderías y cafés con opciones sin gluten en Argentina. Puede incluir reseñas y clasificación cuando hay datos en la ficha.",
  },
  {
    question: "¿Qué muestra el mapa?",
    answer:
      "Lugares donde personas con celiaquía buscan opciones: locales sin tacc, con cocina separada o con opciones según datos aportados por la comunidad.",
  },
  {
    question: "¿Cómo lo uso?",
    answer:
      "Abrí el mapa interactivo, activá tu ubicación o buscá una ciudad, y filtrá por tipo de lugar. Podés leer reseñas antes de ir.",
  },
]

export const metadata: Metadata = {
  title: "Mapa celíaco: lugares sin gluten",
  description:
    "Mapa celíaco de Argentina: restaurantes, cafés y panaderías sin gluten con datos aportados por la comunidad.",
  keywords: [
    "mapa celiaco",
    "mapa celíaco",
    "mapa celiacos",
    "mapa para celiacos",
    "mapa para celíacos",
    "celiaco",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Mapa celíaco: lugares sin gluten",
    description:
      "Mapa celíaco con lugares sin gluten en Argentina. Reseñas de la comunidad y filtros por ciudad.",
    url: CANONICAL,
    type: "website",
  },
}

export default function MapaCeliacoPage() {
  return (
    <MapLandingPage
      h1="Mapa celíaco de Argentina"
      intro="El mapa para celíacos que usa la comunidad: restaurantes, panaderías y cafés sin gluten, con reseñas cuando existen."
      canonicalPath="/mapa"
      metaTitle="Mapa celíaco: lugares sin gluten"
      metaDescription={metadata.description as string}
      faq={FAQ}
      keywordParagraphs={[
        "Si buscás un mapa celíaco, CeliMap te muestra lugares con reseñas cuando existen, clasificación cargada y datos para llegar.",
        "Podés filtrar por 100% libre de gluten u opciones sin TACC. La Plata, Tucumán, Córdoba y Buenos Aires tienen cobertura variable según lo cargado.",
        "Es el mismo mapa de CeliMap — solo otra forma de buscarlo si venís de Google.",
      ]}
      crossLink={{ href: "/mapa-sin-tacc", label: "también buscado como mapa sin tacc" }}
    />
  )
}
