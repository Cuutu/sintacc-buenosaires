import type { City } from "@/lib/seo/cities"
import type { PlaceSEO } from "@/lib/seo/places"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { INDEXING_THRESHOLDS } from "@/lib/seo/indexing-config"

const BASE_URL = getBaseUrl()

interface CityPageJsonLdProps {
  city: City
  categorySlug?: string
  places: PlaceSEO[]
  /** Total real de resultados (no solo la página actual). */
  totalPlaces?: number
  faqs: { question: string; answer: string }[]
  /** Emitir ItemList solo si hay resultados visibles útiles. */
  emitItemList?: boolean
}

export function CityPageJsonLd({
  city,
  categorySlug,
  places,
  totalPlaces,
  faqs,
  emitItemList = true,
}: CityPageJsonLdProps) {
  const breadcrumbItems = [
    { name: "Inicio", item: BASE_URL },
    { name: "Sin gluten", item: `${BASE_URL}/sin-gluten-argentina` },
    { name: city.name, item: `${BASE_URL}/sin-gluten/${city.slug}` },
  ]
  if (categorySlug) {
    breadcrumbItems.push({
      name: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
      item: `${BASE_URL}/sin-gluten/${city.slug}/${categorySlug}`,
    })
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.item,
    })),
  }

  const visiblePlaces = places.filter(Boolean)
  const shouldEmitItemList =
    emitItemList && visiblePlaces.length >= INDEXING_THRESHOLDS.itemListMinPlaces

  const itemListSchema = shouldEmitItemList
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: categorySlug
          ? `${categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)} sin gluten en ${city.name}`
          : `Lugares sin gluten en ${city.name}`,
        numberOfItems: totalPlaces ?? visiblePlaces.length,
        itemListElement: visiblePlaces.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "LocalBusiness",
            name: p.name,
            ...(p.address
              ? { address: { "@type": "PostalAddress", streetAddress: p.address } }
              : {}),
            url: `${BASE_URL}${getPlacePath(p)}`,
          },
        })),
      }
    : null

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  )
}
