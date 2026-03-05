/**
 * JSON-LD ItemList con FoodEstablishment para páginas provinciales.
 */
import type { PlaceSEO } from "@/lib/seo/places"

const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

interface ProvincialPageJsonLdProps {
  provinceName: string
  provinceSlug: string
  places: PlaceSEO[]
}

function getSameAs(place: PlaceSEO): string | undefined {
  if (place.contact?.url) return place.contact.url
  if (place.contact?.instagram) {
    const ig = place.contact.instagram.replace(/^@/, "")
    return `https://www.instagram.com/${ig}`
  }
  return undefined
}

export function ProvincialPageJsonLd({
  provinceName,
  provinceSlug,
  places,
}: ProvincialPageJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Establecimientos sin gluten en ${provinceName}`,
    description: `Listado de restaurantes, panaderías y tiendas aptas para celíacos en ${provinceName}, Argentina`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 100).map((p, i) => {
      const sameAs = getSameAs(p)
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "FoodEstablishment",
          name: p.name,
          address: p.address
            ? {
                "@type": "PostalAddress",
                streetAddress: p.address,
                addressLocality: p.neighborhood,
                addressCountry: "AR",
              }
            : undefined,
          sameAs: sameAs || undefined,
          url: `${BASE_URL}/lugar/${p._id}`,
        },
      }
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
