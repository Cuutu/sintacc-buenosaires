import { getBaseUrl } from "@/lib/base-url"
import {
  CELIMAP_DESCRIPTION,
  CELIMAP_NAME,
  CELIMAP_SAME_AS,
} from "@/lib/seo/brand"

/**
 * JSON-LD global: Organization + WebSite.
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
    logo: `${BASE_URL}/CelimapLOGO.png`,
    description: CELIMAP_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Argentina",
    },
  }

  if (CELIMAP_SAME_AS.length > 0) {
    organizationSchema.sameAs = CELIMAP_SAME_AS
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
    </>
  )
}
