import { getBaseUrl } from "@/lib/base-url"
import {
  CELIMAP_DESCRIPTION,
  CELIMAP_NAME,
  CELIMAP_SAME_AS,
} from "@/lib/seo/brand"

/**
 * JSON-LD global: Organization + WebSite + WebApplication.
 * FAQPage NO va acá (solo donde las FAQ son visibles, p. ej. home).
 */
export function JsonLdScript() {
  const BASE_URL = getBaseUrl()

  const organizationSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: CELIMAP_NAME,
    alternateName: [
      "Celimap",
      "Mapa para celíacos",
      "Mapa sin tacc",
      "Mapa celíaco",
    ],
    url: BASE_URL,
    logo: `${BASE_URL}/brand/app-icon.png`,
    description: CELIMAP_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Argentina",
    },
    knowsAbout: [
      "sin TACC",
      "sin gluten",
      "mapa para celíacos",
      "restaurantes sin gluten",
      "comercios Sin TACC",
    ],
  }

  if (CELIMAP_SAME_AS.length > 0) {
    organizationSchema.sameAs = CELIMAP_SAME_AS
  }

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: CELIMAP_NAME,
    url: BASE_URL,
    description: CELIMAP_DESCRIPTION,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "es-AR",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ARS",
    },
    publisher: {
      "@type": "Organization",
      name: CELIMAP_NAME,
      url: BASE_URL,
    },
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: CELIMAP_NAME,
    alternateName: ["Celimap", "Mapa para celíacos", "Mapa sin tacc", "Mapa celíaco"],
    url: BASE_URL,
    description: CELIMAP_DESCRIPTION,
    inLanguage: "es-AR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/mapa?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
    </>
  )
}
