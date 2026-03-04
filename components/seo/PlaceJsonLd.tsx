/**
 * JSON-LD LocalBusiness schema para páginas de lugar individual.
 * Mejora la visibilidad en resultados locales y rich snippets.
 */
const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bakery: "Panadería",
  store: "Tienda",
  icecream: "Heladería",
  bar: "Bar",
  other: "Local",
}

interface PlaceJsonLdProps {
  place: {
    _id: string
    name: string
    type: string
    neighborhood: string
    address?: string
    location?: { lat: number; lng: number }
    photos?: string[]
    contact?: { url?: string; phone?: string }
    openingHours?: string
    stats?: { avgRating?: number; totalReviews?: number }
  }
}

export function PlaceJsonLd({ place }: PlaceJsonLdProps) {
  const placeUrl = `${BASE_URL}/lugar/${place._id}`
  const imageUrl = place.photos?.[0] ? place.photos[0] : `${BASE_URL}/CelimapLOGO.png`
  const typeLabel = TYPE_LABELS[place.type] || "Local"

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: place.name,
    description: `${place.name} - ${typeLabel} sin gluten en ${place.neighborhood}. Lugar apto para celíacos en Argentina.`,
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
    priceRange: "$$",
    telephone: place.contact?.phone || undefined,
    ...(place.contact?.url ? { sameAs: [place.contact.url] } : {}),
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
