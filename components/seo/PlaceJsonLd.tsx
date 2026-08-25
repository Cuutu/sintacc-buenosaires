import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { getCityBySlug } from "@/lib/seo/cities"

/**
 * JSON-LD LocalBusiness schema para páginas de lugar individual.
 * Mejora la visibilidad en resultados locales y rich snippets.
 */
const BASE_URL = getBaseUrl()

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Local",
}

const SCHEMA_TYPES: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "CafeOrCoffeeShop",
  bakery: "Bakery",
  store: "Store",
  icecream: "IceCreamShop",
  bar: "BarOrPub",
  other: "LocalBusiness",
}

interface PlaceJsonLdProps {
  place: {
    _id: string
    slug?: string | null
    name: string
    type: string
    neighborhood: string
    province?: string
    locality?: string
    address?: string
    location?: { lat: number; lng: number }
    photos?: string[]
    contact?: { url?: string; phone?: string; instagram?: string }
    openingHours?: string
    stats?: { avgRating?: number; totalReviews?: number }
  }
}

export function PlaceJsonLd({ place }: PlaceJsonLdProps) {
  const placeUrl = `${BASE_URL}${getPlacePath(place)}`
  const imageUrl = place.photos?.[0] ? place.photos[0] : `${BASE_URL}/CelimapLOGO.png`
  const typeLabel = TYPE_LABELS[place.type] || "Local"
  const schemaType = SCHEMA_TYPES[place.type] || "LocalBusiness"
  const sameAs = [place.contact?.url, normalizeInstagramUrl(place.contact?.instagram)].filter(Boolean)

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: place.name,
    description: `${place.name} - ${typeLabel} con opciones Sin TACC en ${place.neighborhood}, según la información cargada en CeliMap.`,
    url: placeUrl,
    image: imageUrl,
    address: place.address
      ? {
          "@type": "PostalAddress",
          streetAddress: place.address,
          addressLocality: place.neighborhood,
          addressCountry: "AR",
        }
      : undefined,
    geo:
      place.location?.lat != null && place.location?.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: place.location.lat,
            longitude: place.location.lng,
          }
        : undefined,
    areaServed: {
      "@type": "Place",
      name: place.neighborhood,
    },
    servesCuisine: "Comida sin gluten",
    telephone: place.contact?.phone || undefined,
    ...(sameAs.length ? { sameAs } : {}),
  }

  if (place.stats?.totalReviews && place.stats.totalReviews > 0 && place.stats.avgRating != null) {
    ;(schema as any).aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: place.stats.avgRating,
      reviewCount: place.stats.totalReviews,
      bestRating: 5,
    }
  }

  if (place.openingHours) {
    ;(schema as any).openingHours = place.openingHours
  }

  // BreadcrumbList: Argentina → Provincia → Ciudad → Lugar
  const breadcrumbItems: { name: string; item: string }[] = [
    { name: "Inicio", item: BASE_URL },
    { name: "Sin gluten Argentina", item: `${BASE_URL}/sin-gluten-argentina` },
  ]
  const province = place.province ? getProvinceBySlug(place.province) : undefined
  if (province) {
    breadcrumbItems.push({
      name: province.name,
      item: `${BASE_URL}/sin-gluten/provincia/${province.slug}`,
    })
  }
  const city = place.locality ? getCityBySlug(place.locality) : undefined
  if (city) {
    breadcrumbItems.push({
      name: city.name,
      item: `${BASE_URL}/sin-gluten/${city.slug}`,
    })
  }
  breadcrumbItems.push({ name: place.name, item: placeUrl })

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}

function normalizeInstagramUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.includes("instagram.com")) return trimmed
  const username = trimmed.replace(/^@/, "")
  return username ? `https://www.instagram.com/${username}` : undefined
}