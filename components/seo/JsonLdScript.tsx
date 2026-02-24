/**
 * JSON-LD structured data para SEO.
 * Se inyecta en el layout raíz.
 */
export function JsonLdScript() {
  const BASE_URL =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Celimap",
    url: BASE_URL,
    logo: `${BASE_URL}/CelimapLOGO.png`,
    description:
      "Celimap - Mapa para celíacos en Buenos Aires. Restaurantes, cafés y panaderías sin TACC.",
    areaServed: {
      "@type": "City",
      name: "Argentina",
      "@id": "https://www.wikidata.org/wiki/Q1486",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Celimap",
    url: BASE_URL,
    description: "Celimap - Mapa para celíacos en Buenos Aires. Lugares sin gluten verificados.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/mapa?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

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
  );
}
