import { getBaseUrl } from "@/lib/base-url"
import { FAQ_ITEMS } from "@/components/home/FaqSection"

/**
 * JSON-LD structured data para SEO.
 * Se inyecta en el layout raíz.
 */
export function JsonLdScript() {
  const BASE_URL = getBaseUrl()

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Celimap",
    alternateName: [
      "Mapa para celíacos",
      "Mapa sin tacc",
      "Mapa celíaco",
      "Mapa celiacos",
    ],
    url: BASE_URL,
    logo: `${BASE_URL}/CelimapLOGO.png`,
    description:
      "Celimap - Mapa para celíacos de Argentina. Restaurantes, cafés y panaderías sin tacc verificados por la comunidad.",
    areaServed: {
      "@type": "Country",
      name: "Argentina",
    },
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Celimap",
    alternateName: ["Mapa para celíacos", "Mapa sin tacc", "Mapa celíaco"],
    url: BASE_URL,
    description:
      "Mapa para celíacos de Argentina. Lugares sin tacc verificados por la comunidad.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/mapa?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
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
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  )
}
