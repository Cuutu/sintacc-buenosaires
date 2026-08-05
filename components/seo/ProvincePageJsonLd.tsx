import type { ProvinceConfig } from "@/lib/seo/provinces"
import type { PlaceSEO } from "@/lib/seo/places"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"

const BASE_URL = getBaseUrl()

interface ProvincePageJsonLdProps {
  province: ProvinceConfig
  places: PlaceSEO[]
}

export function ProvincePageJsonLd({ province, places }: ProvincePageJsonLdProps) {
  const canonical = `${BASE_URL}/sin-gluten/provincia/${province.slug}`

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Sin gluten Argentina", item: `${BASE_URL}/sin-gluten-argentina` },
      { "@type": "ListItem", position: 3, name: province.name, item: canonical },
    ],
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Lugares sin TACC en ${province.name}`,
    description: `Restaurantes, cafeterías, panaderías y tiendas sin gluten en ${province.name}, Argentina.`,
    url: canonical,
    inLanguage: "es-AR",
  }

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Lugares sin TACC en ${province.name}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 100).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}${getPlacePath(p)}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
    </>
  )
}