import type { Metadata } from "next"
import { MapLandingPage } from "@/components/seo/MapLandingPage"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const CANONICAL = `${BASE_URL}/mapa-sin-tacc`

const FAQ = [
  {
    question: "¿Dónde encuentro un mapa sin tacc?",
    answer:
      "En Celimap tenés un mapa interactivo con restaurantes, cafés y panaderías aptas para celíacos en Argentina. Podés filtrar por ciudad, barrio y tipo de lugar.",
  },
  {
    question: "¿Es gratis?",
    answer:
      "Sí, Celimap es gratuito para explorar lugares sin gluten. Solo necesitás cuenta si querés guardar favoritos o dejar reseñas.",
  },
  {
    question: "¿Qué ciudades cubre?",
    answer:
      "Hay lugares en Buenos Aires, La Plata, San Miguel de Tucumán, Córdoba, Rosario, Mendoza y más ciudades de Argentina.",
  },
]

export const metadata: Metadata = {
  title: "Mapa sin tacc | Lugares aptos celíacos - Celimap",
  description:
    "¿Buscás un mapa sin tacc? Celimap tiene restaurantes, cafés y panaderías sin gluten en Argentina, verificados por la comunidad celíaca.",
  keywords: [
    "mapa sin tacc",
    "lugares sin tacc",
    "restaurantes sin tacc argentina",
    "mapa celiaco",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Mapa sin tacc | Celimap",
    description:
      "Mapa sin tacc con lugares aptos para celíacos en Argentina. Restaurantes, cafés y panaderías verificados.",
    url: CANONICAL,
    type: "website",
  },
}

export default function MapaSinTaccPage() {
  return (
    <MapLandingPage
      h1="Mapa sin tacc de Argentina"
      intro="Si buscás un mapa sin tacc, acá está: restaurantes, cafés y panaderías seguros para celíacos, con reseñas reales y filtros por ciudad."
      canonicalPath="/mapa-sin-tacc"
      metaTitle="Mapa sin tacc | Celimap"
      metaDescription={metadata.description as string}
      faq={FAQ}
      keywordParagraphs={[
        "Mucha gente busca «mapa sin tacc» cuando quiere comer tranquilo. Celimap reúne esos lugares con reseñas de la comunidad y datos de contacto.",
        "El mapa cubre Buenos Aires, La Plata, Tucumán y decenas de ciudades más. Activá tu ubicación para ver opciones cerca o explorá barrio por barrio.",
        "Si conocés un lugar seguro, podés sumarlo en minutos. La comunidad celíaca lo mantiene actualizado.",
      ]}
      crossLink={{ href: "/mapa-celiaco", label: "también buscado como mapa celíaco" }}
    />
  )
}
