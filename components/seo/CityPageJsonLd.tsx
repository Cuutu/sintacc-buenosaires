import type { City } from "@/lib/seo/cities"
import type { PlaceSEO } from "@/lib/seo/places"

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

interface CityPageJsonLdProps {
  city: City
  categorySlug?: string
  places: PlaceSEO[]
  faqs: { question: string; answer: string }[]
}

export function CityPageJsonLd({ city, categorySlug, places, faqs }: CityPageJsonLdProps) {
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

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categorySlug
      ? `${categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)} sin gluten en ${city.name}`
      : `Lugares sin gluten en ${city.name}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: p.name,
        address: p.address ? { "@type": "PostalAddress", streetAddress: p.address } : undefined,
        url: `${BASE_URL}/lugar/${p._id}`,
      },
    })),
  }

  const faqSchema = {
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}
