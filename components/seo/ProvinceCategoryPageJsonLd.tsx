import type { ProvinceConfig } from "@/lib/seo/provinces"
import type { PlaceSEO } from "@/lib/seo/places"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { getCategoryBySlug } from "@/lib/seo/cities"

const BASE_URL = getBaseUrl()

interface ProvinceCategoryPageJsonLdProps {
  province: ProvinceConfig
  categorySlug: string
  places: PlaceSEO[]
}

export function ProvinceCategoryPageJsonLd({ province, categorySlug, places }: ProvinceCategoryPageJsonLdProps) {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  const canonical = `${BASE_URL}/sin-gluten/provincia/${province.slug}/${categorySlug}`

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Sin gluten Argentina", item: `${BASE_URL}/sin-gluten-argentina` },
      { "@type": "ListItem", position: 3, name: province.name, item: `${BASE_URL}/sin-gluten/provincia/${province.slug}` },
      { "@type": "ListItem", position: 4, name: catName, item: canonical },
    ],
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${catName} sin TACC en ${province.name}`,
    description: `${catName} sin gluten en la provincia de ${province.name}, Argentina.`,
    url: canonical,
    inLanguage: "es-AR",
  }

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${catName} sin TACC en ${province.name}`,
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