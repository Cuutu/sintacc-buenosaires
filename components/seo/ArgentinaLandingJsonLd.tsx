/**
 * JSON-LD para la landing de Argentina: ItemList con ciudades.
 */
const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

interface City {
  slug: string
  name: string
}

interface ArgentinaLandingJsonLdProps {
  cities: City[]
}

export function ArgentinaLandingJsonLd({ cities }: ArgentinaLandingJsonLdProps) {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lugares sin gluten en Argentina por ciudad",
    description: "Mapa de ciudades con restaurantes, panaderías y cafés sin TACC en Argentina.",
    numberOfItems: cities.length,
    itemListElement: cities.map((city, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Lugares sin gluten en ${city.name}`,
      url: `${BASE_URL}/sin-gluten/${city.slug}`,
    })),
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Dónde comer sin gluten en Argentina?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En Celimap encontrás el mapa de lugares sin gluten en Buenos Aires, Córdoba, Rosario, Mendoza y más ciudades. Restaurantes, panaderías y cafés aptos celíacos verificados por la comunidad.",
        },
      },
      {
        "@type": "Question",
        name: "¿Hay restaurantes sin TACC en Buenos Aires?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, hay muchos restaurantes sin gluten en Buenos Aires. Celimap reúne opciones 100% sin TACC y locales con menú adaptado, verificados por la comunidad celíaca.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo encontrar panaderías sin gluten?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Usá el mapa de Celimap para filtrar por tipo de establecimiento. Hay panaderías dedicadas y otras con opciones sin TACC en las principales ciudades de Argentina.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  )
}
