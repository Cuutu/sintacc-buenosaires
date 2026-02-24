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
      "Mapa de lugares sin TACC en Argentina. Restaurantes, cafés y panaderías aptas para celíacos.",
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
    description: "Mapa de lugares sin gluten en Argentina para celíacos.",
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
